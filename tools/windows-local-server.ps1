param(
    [ValidateRange(1024,65535)]
    [int]$Port = 4173,
    [ValidateRange(0,100)]
    [int]$PortSearchCount = 20,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$RootPrefix = $Root.TrimEnd('\') + '\'

$Mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.mjs'  = 'text/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.md'   = 'text/markdown; charset=utf-8'
    '.txt'  = 'text/plain; charset=utf-8'
}

function Write-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$Status,
        [string]$Reason,
        [byte[]]$Body,
        [string]$ContentType = 'text/plain; charset=utf-8',
        [bool]$SendBody = $true
    )

    if ($null -eq $Body) { $Body = [byte[]]@() }
    $Header = "HTTP/1.1 $Status $Reason`r`n" +
              "Content-Type: $ContentType`r`n" +
              "Content-Length: $($Body.Length)`r`n" +
              "Cache-Control: no-store, no-cache, must-revalidate`r`n" +
              "Pragma: no-cache`r`n" +
              "Connection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
    if ($SendBody -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

$Listener = $null
$SelectedPort = $null
$LastBindError = $null

for ($Offset = 0; $Offset -le $PortSearchCount; $Offset++) {
    $CandidatePort = $Port + $Offset
    if ($CandidatePort -gt 65535) { break }

    $CandidateListener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $CandidatePort)
    try {
        $CandidateListener.Start()
        $Listener = $CandidateListener
        $SelectedPort = $CandidatePort
        break
    } catch [System.Net.Sockets.SocketException] {
        $LastBindError = $_.Exception
        try { $CandidateListener.Stop() } catch { }
        if ($_.Exception.SocketErrorCode -eq [System.Net.Sockets.SocketError]::AddressAlreadyInUse) {
            Write-Host "Port $CandidatePort is busy. Trying port $($CandidatePort + 1)..."
            continue
        }
        throw
    }
}

if ($null -eq $Listener -or $null -eq $SelectedPort) {
    $Detail = if ($null -ne $LastBindError) { $LastBindError.Message } else { 'No free port was found.' }
    throw "Could not start localhost. No available port found from $Port through $([Math]::Min(65535, $Port + $PortSearchCount)). $Detail"
}

$Port = $SelectedPort

try {
    $Url = "http://127.0.0.1:$Port/"
    Write-Host ""
    Write-Host "Digilians E-Learn local server: $Url"
    Write-Host "PowerShell fallback mode - loopback only."
    Write-Host "Press Ctrl+C to stop."
    Write-Host ""

    if (-not $NoBrowser) {
        try { Start-Process $Url | Out-Null } catch { }
    }

    while ($true) {
        $Client = $Listener.AcceptTcpClient()
        try {
            $Client.ReceiveTimeout = 10000
            $Client.SendTimeout = 10000
            $Stream = $Client.GetStream()
            $Reader = New-Object System.IO.StreamReader($Stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $RequestLine = $Reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($RequestLine) -or $RequestLine -notmatch '^(GET|HEAD)\s+(\S+)\s+HTTP/') {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Bad Request')
                Write-Response -Stream $Stream -Status 400 -Reason 'Bad Request' -Body $Body
                continue
            }

            $Method = $Matches[1]
            $RawTarget = $Matches[2]

            do {
                $HeaderLine = $Reader.ReadLine()
            } while ($null -ne $HeaderLine -and $HeaderLine.Length -gt 0)

            try {
                $Uri = [System.Uri]::new("http://local$RawTarget")
                $Relative = [System.Uri]::UnescapeDataString($Uri.AbsolutePath).TrimStart('/')
                if ([string]::IsNullOrWhiteSpace($Relative)) { $Relative = 'index.html' }
                $Relative = $Relative.Replace('/', '\')
                $Target = [System.IO.Path]::GetFullPath((Join-Path $Root $Relative))
            } catch {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Bad Request')
                Write-Response -Stream $Stream -Status 400 -Reason 'Bad Request' -Body $Body -SendBody ($Method -ne 'HEAD')
                continue
            }

            $InsideRoot = $Target.StartsWith($RootPrefix, [System.StringComparison]::OrdinalIgnoreCase)
            if (-not $InsideRoot) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden 403')
                Write-Response -Stream $Stream -Status 403 -Reason 'Forbidden' -Body $Body -SendBody ($Method -ne 'HEAD')
                continue
            }

            if (Test-Path -LiteralPath $Target -PathType Container) {
                $Target = Join-Path $Target 'index.html'
            }

            if (-not (Test-Path -LiteralPath $Target -PathType Leaf)) {
                $Body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
                Write-Response -Stream $Stream -Status 404 -Reason 'Not Found' -Body $Body -SendBody ($Method -ne 'HEAD')
                continue
            }

            $Bytes = [System.IO.File]::ReadAllBytes($Target)
            $Ext = [System.IO.Path]::GetExtension($Target).ToLowerInvariant()
            $Type = if ($Mime.ContainsKey($Ext)) { $Mime[$Ext] } else { 'application/octet-stream' }
            Write-Response -Stream $Stream -Status 200 -Reason 'OK' -Body $Bytes -ContentType $Type -SendBody ($Method -ne 'HEAD')
        } catch {
            try {
                if ($null -ne $Stream) {
                    $Body = [System.Text.Encoding]::UTF8.GetBytes('Server Error')
                    Write-Response -Stream $Stream -Status 500 -Reason 'Server Error' -Body $Body
                }
            } catch { }
        } finally {
            if ($null -ne $Reader) { $Reader.Dispose() }
            if ($null -ne $Stream) { $Stream.Dispose() }
            $Client.Dispose()
            $Reader = $null
            $Stream = $null
        }
    }
} finally {
    $Listener.Stop()
}
