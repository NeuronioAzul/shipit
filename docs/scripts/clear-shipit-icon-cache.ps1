[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [switch]$Apply,
    [switch]$RestartExplorer
)

$ErrorActionPreference = 'Stop'
$dryRun = -not $Apply

Write-Host 'ShipIt! - limpeza manual do cache de icones do Windows'
Write-Host 'Esta rotina mexe em caches globais do shell. Ela nao remove banco, evidencias, relatorios, settings ou arquivos da instalacao do ShipIt!.'

if ($dryRun) {
    Write-Host 'Modo dry-run ativo. Use -Apply para executar a remocao real.'
}

$cachePatterns = @(
    (Join-Path $env:LOCALAPPDATA 'IconCache.db')
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer\iconcache*.db')
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Explorer\thumbcache*.db')
)

$targets = foreach ($pattern in $cachePatterns) {
    Get-ChildItem -Path $pattern -Force -ErrorAction SilentlyContinue
}

if (-not $targets) {
    Write-Host 'Nenhum arquivo de cache encontrado para limpar.'
} else {
    foreach ($target in $targets) {
        if ($PSCmdlet.ShouldProcess($target.FullName, 'Remover cache de icone/thumbnail do Windows')) {
            Remove-Item -LiteralPath $target.FullName -Force -WhatIf:$dryRun
        }
    }
}

if ($RestartExplorer) {
    if ($PSCmdlet.ShouldProcess('explorer.exe', 'Reiniciar Explorer para reconstruir o cache')) {
        Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue -WhatIf:$dryRun
        if (-not $dryRun) {
            Start-Process explorer.exe
        }
    }
} else {
    Write-Host 'Explorer nao foi reiniciado. Se o icone antigo persistir, execute novamente com -Apply -RestartExplorer.'
}
