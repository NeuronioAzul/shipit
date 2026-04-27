# Publishing Troubleshooting Guide

Este guia ajuda a resolver problemas comuns ao publicar a extensão no VS Code Marketplace.

## 🔴 Erro: "The user is not authorized to access this resource" (TF400813)

### Sintomas

```
ERROR  TF400813: The user 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' is not authorized to access this resource.
```

### Causas Comuns

#### 1. Permissão Incorreta no PAT (Personal Access Token)

❌ **ERRADO**: Criar PAT com permissão "Marketplace (Publish)"  
✅ **CORRETO**: Criar PAT com permissão "Marketplace (**Manage**)"

**Solução:**

1. Acesse: <https://dev.azure.com/[sua-org]/_usersSettings/tokens>
2. Clique em "New Token"
3. Em **Scopes**, selecione:
   - Custom defined
   - Marketplace: **Manage** (não apenas Publish!)
4. Defina expiração (recomendado: 90 dias)
5. Clique em "Create"
6. **COPIE O TOKEN IMEDIATAMENTE** (não será mostrado novamente)

#### 2. Usuário Não Adicionado ao Publisher

Mesmo com PAT válido, sua conta Microsoft precisa estar autorizada no publisher.

**Solução:**

1. Acesse: <https://marketplace.visualstudio.com/manage>
2. Faça login com sua conta Microsoft
3. Selecione seu publisher (ex: `NeuronioAzul`)
4. Vá em **Members** / **Membros**
5. Clique em "Add" / "Adicionar"
6. Digite o email da sua conta Microsoft
7. Selecione role: **Creator** ou **Owner**
8. Salve

#### 3. Publisher Não Criado

Se é a primeira publicação, você precisa criar o publisher primeiro.

**Solução:**

1. Acesse: <https://marketplace.visualstudio.com/manage/createpublisher>
2. Preencha:
   - **Publisher ID**: mesmo valor do campo `publisher` no `package.json`
   - **Display Name**: nome visível no marketplace
   - **Email**: email para contato
3. Aceite os termos
4. Clique em "Create"

#### 4. Organização Azure DevOps Incorreta

O PAT pode estar vinculado a uma organização diferente da esperada.

**Solução:**

1. Verifique qual organização está usando: <https://dev.azure.com/>
2. Se tiver múltiplas organizações:
   - Certifique-se de criar o PAT na organização correta
   - O publisher deve estar na mesma organização

### Verificação Rápida

Execute este checklist antes de publicar:

```bash
# 1. Verificar publisher no package.json
grep "publisher" package.json
# Deve mostrar: "publisher": "NeuronioAzul"

# 2. Verificar se você tem acesso ao publisher
# Abra: https://marketplace.visualstudio.com/manage/publishers/NeuronioAzul
# Você deve conseguir ver a página sem erro 404

# 3. Testar o PAT manualmente
# Cole seu PAT abaixo e execute:
PAT="seu-pat-aqui"
curl -s -H "Authorization: Basic $(echo -n "user:$PAT" | base64)" \
  "https://marketplace.visualstudio.com/_apis/gallery/publishers/NeuronioAzul"
# Se retornar JSON com dados do publisher = OK
# Se retornar erro 401/403/404 = Problema!
```

## 🟡 Outros Erros Comuns

### PAT Expirado

**Sintoma:**

```
ERROR  401 Unauthorized
```

**Solução:**

- Crie um novo PAT seguindo as instruções acima
- Execute: `./publish.sh --pat NOVO_PAT`

### Versão Já Publicada

**Sintoma:**

```
ERROR  Extension version 1.2.1 already exists
```

**Solução:**

- Incremente a versão no `package.json`
- Atualize o `CHANGELOG.md`
- Execute `./publish.sh` novamente

### Arquivo .vscodeignore Incorreto

**Sintoma:**

```
WARNING  Some files are missing in the package
```

**Solução:**

- Verifique o arquivo `.vscodeignore`
- Certifique-se de que não está ignorando arquivos essenciais
- Teste localmente: `vsce package`

## 📋 Passo a Passo Completo (Primeira Vez)

### 1. Criar Publisher (Apenas Primeira Vez)

1. Acesse: <https://marketplace.visualstudio.com/manage/createpublisher>
2. Publisher ID: `NeuronioAzul` (ou outro)
3. Display Name: `Neuronio Azul`
4. Email: <seu-email@exemplo.com>
5. Clique em "Create"

### 2. Criar Personal Access Token

1. Acesse: <https://dev.azure.com/[org]/_usersSettings/tokens>
2. New Token
3. Nome: `vscode-marketplace-publish`
4. Organização: All accessible organizations
5. Expiração: 90 dias (ou custom)
6. Scopes: Custom defined
   - **Marketplace: Manage** ✅
7. Create
8. **COPIE O TOKEN** 📋

### 3. Adicionar Membro ao Publisher

1. Acesse: <https://marketplace.visualstudio.com/manage/publishers/NeuronioAzul>
2. Members
3. Add
4. Email da sua conta Microsoft
5. Role: Creator ou Owner
6. Save

### 4. Publicar

```bash
./publish.sh --pat SEU_PAT_AQUI
```

Ou modo interativo:

```bash
./publish.sh
```

## 🔍 Debug Avançado

### Verificar Resposta da API

```bash
# Substituir SEU_PAT e SEU_PUBLISHER
PAT="seu-pat"
PUBLISHER="NeuronioAzul"

# Testar autenticação
curl -v -H "Authorization: Basic $(echo -n "user:$PAT" | base64)" \
  "https://marketplace.visualstudio.com/_apis/gallery/publishers/$PUBLISHER" \
  2>&1 | grep -E "(HTTP|TF[0-9]+)"
```

### Logs do vsce

Adicione `--debug` para ver logs detalhados:

```bash
vsce publish -p SEU_PAT --debug
```

## 📞 Suporte

Se os problemas persistirem:

1. **Documentação Oficial**: <https://code.visualstudio.com/api/working-with-extensions/publishing-extension>
2. **GitHub Issues**: <https://github.com/microsoft/vscode-vsce/issues>
3. **Stack Overflow**: Tag `vscode-extension`

## ✅ Checklist Final

Antes de publicar, confirme:

- [ ] PAT criado com permissão **Manage** (não Publish)
- [ ] Conta Microsoft adicionada ao publisher como Creator/Owner
- [ ] Publisher existe no marketplace
- [ ] `package.json` tem o `publisher` correto
- [ ] Versão no `package.json` foi incrementada
- [ ] `CHANGELOG.md` foi atualizado
- [ ] Git tag foi criado e enviado
- [ ] Todas as mudanças foram commitadas
- [ ] Código compilado sem erros (`npm run compile`)
- [ ] PAT não expirado (válido por pelo menos 1 dia)

---

**Última atualização**: 2025-12-23
