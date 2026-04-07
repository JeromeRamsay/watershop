<#
.SYNOPSIS
    Watershop — DigitalOcean App Platform log access helper.

.DESCRIPTION
    Wraps doctl to quickly tail runtime, deploy, or build logs for any
    component of your Watershop app. Requires doctl to be installed and
    authenticated (run: doctl auth init).

.PARAMETER Component
    The App Platform component name (e.g. api, web, ui).
    Defaults to "api".

.PARAMETER Type
    The log type: run (runtime), deploy, or build.
    Defaults to "run".

.PARAMETER Follow
    If specified, streams logs continuously (like tail -f).

.PARAMETER AppId
    Your DigitalOcean App ID. If omitted, the script will list all apps
    and prompt you to enter one.

.EXAMPLE
    .\scripts\logs.ps1
    # Lists apps, prompts for App ID, shows runtime API logs

.EXAMPLE
    .\scripts\logs.ps1 -Component api -Type run -Follow
    # Streams live runtime logs for the api component

.EXAMPLE
    .\scripts\logs.ps1 -Component web -Type deploy -AppId abc123
    # Shows deploy logs for the web component without prompting
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Component = "api",

    [Parameter(Mandatory = $false)]
    [ValidateSet("run", "deploy", "build")]
    [string]$Type = "run",

    [Parameter(Mandatory = $false)]
    [switch]$Follow,

    [Parameter(Mandatory = $false)]
    [string]$AppId
)

# ── Verify doctl is available ─────────────────────────────────────────────────
if (-not (Get-Command doctl -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "  ERROR: doctl is not installed." -ForegroundColor Red
    Write-Host "  Install it with:" -ForegroundColor Yellow
    Write-Host "    winget install DigitalOcean.doctl" -ForegroundColor Cyan
    Write-Host "  Then authenticate:"
    Write-Host "    doctl auth init" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

# ── Resolve App ID ────────────────────────────────────────────────────────────
if (-not $AppId) {
    Write-Host ""
    Write-Host "  Listing your DigitalOcean Apps..." -ForegroundColor Cyan
    Write-Host ""
    doctl apps list --format ID,Spec.Name,DefaultIngress,ActiveDeployment.Phase
    Write-Host ""
    $AppId = Read-Host "  Enter the App ID for your Watershop app"
    Write-Host ""
}

# ── Build doctl arguments ─────────────────────────────────────────────────────
$logArgs = @(
    "apps", "logs", $AppId,
    "--type=$Type",
    "--component=$Component"
)

if ($Follow) {
    $logArgs += "--follow"
}

# ── Print what we are doing ───────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║         Watershop — DigitalOcean Logs            ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  App ID   : $AppId"   -ForegroundColor Gray
Write-Host "  Component: $Component" -ForegroundColor Gray
Write-Host "  Log type : $Type"    -ForegroundColor Gray
Write-Host "  Follow   : $($Follow.IsPresent)" -ForegroundColor Gray
Write-Host ""

if ($Follow) {
    Write-Host "  Streaming logs... Press Ctrl+C to stop." -ForegroundColor Yellow
} else {
    Write-Host "  Fetching logs..." -ForegroundColor Yellow
}

Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Execute ───────────────────────────────────────────────────────────────────
doctl @logArgs

