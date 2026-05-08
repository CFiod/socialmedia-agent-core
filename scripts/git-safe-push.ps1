# ===============================
# GIT SAFE PUSH SCRIPT
# SocialMedia_Agent - v1.1
# ===============================

Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host "  GIT SAFE PUSH - SocialMedia Agent" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se .env esta sendo rastreado
Write-Host "[CHECK] Verificando arquivos sensiveis..." -ForegroundColor Yellow

$trackedEnv = git ls-files | Select-String -Pattern '\.env$'

if ($trackedEnv) {
    Write-Host "[ERRO] .env esta sendo rastreado pelo Git!" -ForegroundColor Red
    Write-Host "       Execute: git rm --cached .env" -ForegroundColor Red
    exit 1
}

# 2. Verificar variantes de .env (exceto .env.example que e seguro)
$trackedEnvVariants = git ls-files | Select-String -Pattern '\.env\.' | Where-Object { $_ -notmatch '\.env\.example' }

if ($trackedEnvVariants) {
    Write-Host "[ERRO] Arquivo .env.* com possiveis segredos detectado:" -ForegroundColor Red
    $trackedEnvVariants
    Write-Host "       Execute: git rm --cached <arquivo>" -ForegroundColor Red
    exit 1
}

# 3. Verificar se node_modules esta sendo rastreado
$trackedNode = git ls-files | Select-String -Pattern 'node_modules'

if ($trackedNode) {
    Write-Host "[ERRO] node_modules esta sendo rastreado!" -ForegroundColor Red
    Write-Host "       Execute: git rm -r --cached node_modules" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Nenhum arquivo sensivel rastreado." -ForegroundColor Green

# 4. Escanear possiveis API keys apenas em arquivos do projeto (exclui node_modules)
Write-Host ""
Write-Host "[CHECK] Escaneando possiveis segredos em arquivos do projeto..." -ForegroundColor Yellow

$secretPattern = 'sk-[a-zA-Z0-9]{20}|OPENAI_API_KEY\s*=\s*\S+|GROQ_API_KEY\s*=\s*\S+|ghp_[a-zA-Z0-9]+|ghs_[a-zA-Z0-9]+'
$projectFiles = git diff --cached --name-only 2>&1 | Where-Object { $_ -notmatch 'node_modules' }
$secrets = @()

foreach ($file in $projectFiles) {
    if (Test-Path $file) {
        $matches = Select-String -Path $file -Pattern $secretPattern -CaseSensitive:$false
        if ($matches) { $secrets += $matches }
    }
}

if ($secrets) {
    Write-Host ""
    Write-Host "[AVISO] POSSIVEL SEGREDO DETECTADO NO CODIGO:" -ForegroundColor Red
    $secrets | ForEach-Object { Write-Host "  >> $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Revise os arquivos acima ANTES de fazer push!" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Nenhum segredo detectado nos arquivos do projeto." -ForegroundColor Green

# 5. Verificar se ha mudancas para commitar
Write-Host ""
Write-Host "[CHECK] Verificando status do repositorio..." -ForegroundColor Yellow

$status = git status --porcelain

if (-not $status) {
    Write-Host "[OK] Nada para commitar. Repositorio esta limpo." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Arquivos modificados:" -ForegroundColor Cyan
git status --short
Write-Host ""

# 6. Adicionar todos os arquivos
Write-Host "[GIT] Adicionando arquivos com git add ." -ForegroundColor Yellow
git add .

# GUARD: verificar se .env entrou no stage por engano
$stagedEnv = git diff --cached --name-only | Select-String -Pattern '\.env' | Where-Object { $_ -notmatch '\.env\.example' }
if ($stagedEnv) {
    Write-Host "[ERRO] .env foi adicionado ao stage acidentalmente!" -ForegroundColor Red
    Write-Host "       Revertendo git add e abortando." -ForegroundColor Red
    git reset HEAD .env 2>$null
    git reset HEAD .env.* 2>$null
    exit 1
}

# 7. Solicitar mensagem de commit
$mensagem = Read-Host "[INPUT] Digite a mensagem do commit (Enter para usar padrao)"

if (-not $mensagem -or $mensagem.Trim() -eq "") {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $mensagem = "chore: atualizacao automatica - $timestamp"
    Write-Host "  Usando mensagem padrao: '$mensagem'" -ForegroundColor DarkGray
}

# 8. Commit
Write-Host ""
Write-Host "[GIT] Commitando..." -ForegroundColor Yellow
git commit -m "$mensagem"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no commit. Verifique os erros acima." -ForegroundColor Red
    exit 1
}

# 9. Push
Write-Host ""
Write-Host "[GIT] Enviando para o GitHub..." -ForegroundColor Yellow
git push

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha no push. Verifique sua conexao ou credenciais." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "  [OK] Push concluido com sucesso!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
