# build-android.ps1
# Workaround for Next.js 15 EINVAL bug on Windows with accented path characters.
# Creates a junction at C:\ZhiApp pointing to the real project dir, builds from there,
# then copies the `out/` directory back to the real project path for `cap sync`.

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$junctionPath = "C:\ZhiApp"

# Create junction if it doesn't exist
if (-not (Test-Path $junctionPath)) {
    Write-Host "[BUILD] Creating junction: $junctionPath -> $projectDir"
    cmd /c "mklink /J `"$junctionPath`" `"$projectDir`"" 2>&1 | Out-Null
    if (-not (Test-Path $junctionPath)) {
        Write-Host "[BUILD] ERROR: Could not create junction. Try running as Administrator."
        exit 1
    }
} else {
    Write-Host "[BUILD] Junction $junctionPath already exists."
}

# Clean out dir
$outDirReal = Join-Path $projectDir "out"
if (Test-Path $outDirReal) {
    Write-Host "[BUILD] Cleaning existing out/ directory..."
    Remove-Item -Recurse -Force $outDirReal
}

# Run build from the junction path (no accented chars)
Write-Host "[BUILD] Running npm run build:static from: $junctionPath"
Push-Location $junctionPath
npm run build:static
$exitCode = $LASTEXITCODE
Pop-Location

Write-Host "[BUILD] Build finished with exit code: $exitCode"

$outDirJunction = Join-Path $junctionPath "out"
if (Test-Path $outDirJunction) {
    $itemCount = (Get-ChildItem $outDirJunction).Count
    Write-Host "[BUILD] out/ found at junction path with $itemCount items."
    
    # Check for index.html
    if (Test-Path (Join-Path $outDirJunction "index.html")) {
        Write-Host "[BUILD] index.html exists. Proceeding with cap sync..."
        
        # The out/ dir at junction IS the real project dir (they are the same via junction)
        # so cap sync can run from the real project dir
        Write-Host "[BUILD] Running: npx cap sync android"
        Set-Location $projectDir
        npx cap sync android
        $capExitCode = $LASTEXITCODE
        Write-Host "[BUILD] cap sync finished with exit code: $capExitCode"
        exit $capExitCode
    } else {
        Write-Host "[BUILD] WARNING: out/ exists but no index.html found. Export may have partially failed."
        Get-ChildItem $outDirJunction | Select-Object Name | Format-Table
        exit 1
    }
} else {
    Write-Host "[BUILD] FAILED: out/ directory not found at $outDirJunction"
    exit 1
}
