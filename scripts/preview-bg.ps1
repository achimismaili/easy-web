<#
.SYNOPSIS
    Starts and stops an Astro preview server without blocking the caller.

.EXAMPLE
    . .\scripts\preview-bg.ps1
    $preview = Start-AstroPreview -AppPath .\apps\contract-fixture -Port 4321
    Invoke-WebRequest "http://127.0.0.1:$($preview.Port)" | Select-Object -ExpandProperty StatusCode
    Stop-AstroPreview -ProcessId $preview.ProcessId -Port $preview.Port
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-AstroPreviewPort {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$LogPath,

        [Parameter(Mandatory)]
        [int]$ProcessId,

        [Parameter(Mandatory)]
        [int]$RequestedPort,

        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $portPattern = '(?i)(?:https?://)?(?:127\.0\.0\.1|localhost|0\.0\.0\.0):(?<port>\d+)'

    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $LogPath) {
            $log = Get-Content -LiteralPath $LogPath -Raw -ErrorAction SilentlyContinue
            if ($log -match $portPattern) {
                return [int]$Matches.port
            }
        }

        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $process) {
            throw "Astro preview process $ProcessId exited before reporting its bound port. Log: $LogPath"
        }

        Start-Sleep -Milliseconds 250
    }

    throw "Timed out waiting for Astro preview to report its bound port (requested $RequestedPort). Log: $LogPath"
}

function Start-AstroPreview {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateScript({
            if (-not (Test-Path -LiteralPath $_ -PathType Container)) {
                throw "AppPath must be an existing directory: $_"
            }
            if (-not (Test-Path -LiteralPath (Join-Path $_ 'dist') -PathType Container)) {
                throw "AppPath must contain a built dist directory: $_"
            }
            $true
        })]
        [string]$AppPath,

        [ValidateRange(1, 65535)]
        [int]$Port = 4321,

        [int]$TimeoutSeconds = 30
    )

    $resolvedAppPath = (Resolve-Path -LiteralPath $AppPath).Path
    $logDirectory = Join-Path $resolvedAppPath '.astro-preview'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

    $logPath = Join-Path $logDirectory "preview-$Port-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $errorPath = Join-Path $logDirectory "preview-$Port-$(Get-Date -Format 'yyyyMMdd-HHmmss').error.log"
    $arguments = "exec astro preview --host 127.0.0.1 --port $Port"

    $process = Start-Process -FilePath 'pnpm' -ArgumentList $arguments -WorkingDirectory $resolvedAppPath `
        -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $errorPath -NoNewWindow

    try {
        $actualPort = Get-AstroPreviewPort -LogPath $logPath -ProcessId $process.Id `
            -RequestedPort $Port -TimeoutSeconds $TimeoutSeconds
    }
    catch {
        Stop-AstroPreview -ProcessId $process.Id -ErrorAction SilentlyContinue
        throw
    }

    [pscustomobject]@{
        ProcessId = $process.Id
        Port      = $actualPort
        LogPath   = $logPath
    }
}

function Stop-AstroPreview {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [int]$ProcessId,

        [int]$Port,

        [int]$WaitMilliseconds = 1000
    )

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Write-Output "Astro preview process $ProcessId is already stopped."
    }
    else {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds $WaitMilliseconds
        Write-Output "Stopped Astro preview process $ProcessId."
    }

    if ($PSBoundParameters.ContainsKey('Port')) {
        Start-Sleep -Milliseconds 250
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($null -eq $connection) {
            Write-Output "Port $Port is free."
        }
        else {
            Write-Error "Port $Port is still listening after stopping process $ProcessId."
        }
    }
}
