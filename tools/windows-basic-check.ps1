$ErrorActionPreference = 'Stop'

$Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$Failures = New-Object System.Collections.Generic.List[string]

function Pass([string]$Message) {
    Write-Host "PASS $Message"
}

function Fail([string]$Message) {
    $Failures.Add($Message)
    Write-Host "FAIL $Message" -ForegroundColor Red
}

Write-Host ""
Write-Host "Digilians E-Learn - Windows Basic Check"
Write-Host ""

$Required = @(
    'index.html',
    'VERSION.txt',
    'assets\css\tokens.css',
    'assets\css\style.css',
    'assets\js\app.js',
    'assets\js\exam.js',
    'assets\js\exam-engine.js',
    'assets\js\exam-modes.js',
    'assets\js\exam-session.js',
    'assets\js\exam-timer.js',
    'assets\js\exam-answers.js',
    'assets\js\exam-navigation.js',
    'assets\js\exam-persistence.js',
    'assets\js\exam-feedback.js',
    'assets\js\exam-results.js',
    'assets\js\voucher-engine.js',
    'assets\js\voucher-content-architecture.js',
    'assets\js\voucher-ranked-learning.js',
    'assets\js\voucher-domain-ranked-learning.js',
    'assets\js\voucher-domain-navigation.js',
    'assets\js\ranking-scopes.js',
    'assets\js\storage.js',
    'data\changelog.json',
    'voucher\registry.json',
    'voucher\tracks\data-analysis\microsoft-pl-300\content-architecture.json'
)

foreach ($Relative in $Required) {
    $Target = Join-Path $Root $Relative
    if (Test-Path -LiteralPath $Target -PathType Leaf) {
        Pass "Required file: $Relative"
    } else {
        Fail "Missing required file: $Relative"
    }
}

try {
    $VersionLine = Get-Content -LiteralPath (Join-Path $Root 'VERSION.txt') -ErrorAction Stop |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ } |
        Select-Object -First 1
    if ($VersionLine -match '^\d+\.\d+\.\d+$') {
        Pass "VERSION.txt = $VersionLine"
    } else {
        Fail "Invalid VERSION.txt: $VersionLine"
    }
} catch {
    Fail "VERSION.txt unreadable: $($_.Exception.Message)"
}

$JsonFiles = @()
foreach ($FolderName in @('data', 'voucher')) {
    $Folder = Join-Path $Root $FolderName
    if (Test-Path -LiteralPath $Folder -PathType Container) {
        $JsonFiles += Get-ChildItem -LiteralPath $Folder -Recurse -File -Filter '*.json'
    }
}

$JsonBad = 0
foreach ($File in $JsonFiles) {
    try {
        Get-Content -LiteralPath $File.FullName -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop | Out-Null
    } catch {
        $JsonBad++
        $Relative = $File.FullName.Substring($Root.Length).TrimStart('\')
        Fail "JSON ${Relative}: $($_.Exception.Message)"
    }
}
if ($JsonBad -eq 0) {
    Pass "JSON parse: $($JsonFiles.Count)/$($JsonFiles.Count)"
}

if ($Failures.Count -gt 0) {
    Write-Host ""
    Write-Host "BASIC CHECK FAILED - $($Failures.Count) issue(s). Localhost was NOT started." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "BASIC CHECK PASS - core files and JSON are readable."
Write-Host "NOTE: Node.js is unavailable, so JavaScript syntax and regression tests were not run."
Write-Host ""
exit 0
