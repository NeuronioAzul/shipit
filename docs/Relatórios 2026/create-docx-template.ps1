param(
    [string]$SourcePath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'RELATÓRIO DE SERVIÇO - ENGENHEIRO DE SOFTWARE.docx'),
    [string]$OutputPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'RELATÓRIO DE SERVIÇO - TEMPLATE.docx')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

$wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function Normalize-Text {
    param([string]$Text)

    if ($null -eq $Text) {
        return ''
    }

    return (($Text -replace [char]0x00A0, ' ') -replace '\s+', ' ').Trim()
}

function Get-NodeText {
    param(
        [System.Xml.XmlNode]$Node,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $textNodes = @($Node.SelectNodes('.//w:t', $NamespaceManager))
    return Normalize-Text (($textNodes | ForEach-Object { $_.InnerText }) -join ' ')
}

function Set-ContainerText {
    param(
        [System.Xml.XmlNode]$Container,
        [string]$Text,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $textNodes = @($Container.SelectNodes('.//w:t', $NamespaceManager))

    if ($textNodes.Count -eq 0) {
        throw "Nenhum no de texto encontrado para substituir."
    }

    $textNodes[0].InnerText = $Text

    for ($index = 1; $index -lt $textNodes.Count; $index++) {
        $textNodes[$index].InnerText = ''
    }
}

function Replace-TextInDescendants {
    param(
        [System.Xml.XmlNode]$Container,
        [string]$OldText,
        [string]$NewText,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $textNodes = @($Container.SelectNodes('.//w:t', $NamespaceManager))

    foreach ($textNode in $textNodes) {
        if ($textNode.InnerText.Contains($OldText)) {
            $textNode.InnerText = $textNode.InnerText.Replace($OldText, $NewText)
            return $true
        }
    }

    return $false
}

function Get-ParagraphByExactText {
    param(
        [System.Xml.XmlDocument]$Document,
        [string]$ExactText,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $paragraphs = @($Document.SelectNodes('//w:body/w:p', $NamespaceManager))
    $matches = @($paragraphs | Where-Object { (Get-NodeText -Node $_ -NamespaceManager $NamespaceManager) -eq $ExactText })

    if ($matches.Count -ne 1) {
        throw "Esperado 1 paragrafo com o texto '$ExactText', mas foram encontrados $($matches.Count)."
    }

    return $matches[0]
}

function Remove-ParagraphByExactText {
    param(
        [System.Xml.XmlDocument]$Document,
        [string]$ExactText,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $paragraph = Get-ParagraphByExactText -Document $Document -ExactText $ExactText -NamespaceManager $NamespaceManager
    $null = $paragraph.ParentNode.RemoveChild($paragraph)
}

function Get-Table {
    param(
        [System.Xml.XmlDocument]$Document,
        [int]$Index,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $tables = @($Document.SelectNodes('//w:tbl', $NamespaceManager))

    if ($Index -lt 1 -or $Index -gt $tables.Count) {
        throw "Tabela $Index nao encontrada."
    }

    return $tables[$Index - 1]
}

function Get-Row {
    param(
        [System.Xml.XmlNode]$Table,
        [int]$Index,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $rows = @($Table.SelectNodes('./w:tr', $NamespaceManager))

    if ($Index -lt 1 -or $Index -gt $rows.Count) {
        throw "Linha $Index nao encontrada na tabela."
    }

    return $rows[$Index - 1]
}

function Get-Cell {
    param(
        [System.Xml.XmlNode]$Row,
        [int]$Index,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $cells = @($Row.SelectNodes('./w:tc', $NamespaceManager))

    if ($Index -lt 1 -or $Index -gt $cells.Count) {
        throw "Celula $Index nao encontrada na linha."
    }

    return $cells[$Index - 1]
}

function Ensure-UpdateFieldsOnOpen {
    param(
        [System.Xml.XmlDocument]$SettingsDocument,
        [System.Xml.XmlNamespaceManager]$NamespaceManager
    )

    $settingsNode = $SettingsDocument.SelectSingleNode('/w:settings', $NamespaceManager)

    if ($null -eq $settingsNode) {
        throw 'No raiz w:settings nao encontrado.'
    }

    $updateFieldsNode = $SettingsDocument.SelectSingleNode('/w:settings/w:updateFields', $NamespaceManager)

    if ($null -eq $updateFieldsNode) {
        $updateFieldsNode = $SettingsDocument.CreateElement('w', 'updateFields', $wordNamespace)
        $null = $settingsNode.AppendChild($updateFieldsNode)
    }

    $valueAttribute = $updateFieldsNode.Attributes.GetNamedItem('w:val')
    if ($null -eq $valueAttribute) {
        $valueAttribute = $SettingsDocument.CreateAttribute('w', 'val', $wordNamespace)
        $null = $updateFieldsNode.Attributes.Append($valueAttribute)
    }

    $valueAttribute.Value = 'true'
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
    throw "Arquivo de origem nao encontrado: $SourcePath"
}

$tempRoot = Join-Path $env:TEMP ("shipit-docx-template-" + [guid]::NewGuid().ToString())

try {
    [System.IO.Directory]::CreateDirectory($tempRoot) | Out-Null
    [System.IO.Compression.ZipFile]::ExtractToDirectory($SourcePath, $tempRoot)

    $documentPath = Join-Path $tempRoot 'word\document.xml'
    $settingsPath = Join-Path $tempRoot 'word\settings.xml'

    $document = New-Object System.Xml.XmlDocument
    $document.PreserveWhitespace = $true
    $document.Load($documentPath)

    $settings = New-Object System.Xml.XmlDocument
    $settings.PreserveWhitespace = $true
    $settings.Load($settingsPath)

    $namespaceManager = New-Object System.Xml.XmlNamespaceManager($document.NameTable)
    $namespaceManager.AddNamespace('w', $wordNamespace)

    $settingsNamespaceManager = New-Object System.Xml.XmlNamespaceManager($settings.NameTable)
    $settingsNamespaceManager.AddNamespace('w', $wordNamespace)

    Set-ContainerText -Container (Get-ParagraphByExactText -Document $document -ExactText 'Contrato n° 06/2022 – Digisystem Serviços Especializados Ltda' -NamespaceManager $namespaceManager) -Text '{{contract_number}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-ParagraphByExactText -Document $document -ExactText 'Mauro Rocha Tavares' -NamespaceManager $namespaceManager) -Text '{{full_name}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-ParagraphByExactText -Document $document -ExactText 'Engenheiro de Software / Sênior' -NamespaceManager $namespaceManager) -Text '{{role}} / {{seniority_level}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-ParagraphByExactText -Document $document -ExactText '30 de janeiro de 2026' -NamespaceManager $namespaceManager) -Text '{{report_generated_date_long}}' -NamespaceManager $namespaceManager

    $objectiveParagraph = Get-ParagraphByExactText -Document $document -ExactText 'O Relatório de Serviço é o instrumento formal de apresentação das atividades realizadas e das entregas executadas pelo profissional no âmbito do CONTRATO 06/2022-STIC, cujo objeto é a prestação de “serviço de desenvolvimento de aplicações de software, na modalidade capacidade gerenciada” .' -NamespaceManager $namespaceManager
    $contractReferenceReplaced = Replace-TextInDescendants -Container $objectiveParagraph -OldText 'CONTRATO 06/2022-STIC' -NewText '{{contract_reference_short}}' -NamespaceManager $namespaceManager
    if (-not $contractReferenceReplaced) {
        throw 'Nao foi possivel localizar o contrato abreviado no paragrafo do objetivo.'
    }

    $basicInfoTable = Get-Table -Document $document -Index 2 -NamespaceManager $namespaceManager
    $basicInfoRow = Get-Row -Table $basicInfoTable -Index 2 -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $basicInfoRow -Index 1 -NamespaceManager $namespaceManager) -Text '{{month_reference}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $basicInfoRow -Index 2 -NamespaceManager $namespaceManager) -Text '{{attendance_presencial_checkbox}} Presencial {{attendance_remoto_checkbox}} Remoto {{attendance_hibrido_checkbox}} Híbrido' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $basicInfoRow -Index 3 -NamespaceManager $namespaceManager) -Text '{{daily_availability}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $basicInfoRow -Index 4 -NamespaceManager $namespaceManager) -Text '{{monthly_availability}}' -NamespaceManager $namespaceManager

    $profileRow = Get-Row -Table $basicInfoTable -Index 4 -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $profileRow -Index 1 -NamespaceManager $namespaceManager) -Text '{{profile_type}} {{role}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $profileRow -Index 2 -NamespaceManager $namespaceManager) -Text '{{correlating_activities}}' -NamespaceManager $namespaceManager

    $activitiesTable = Get-Table -Document $document -Index 3 -NamespaceManager $namespaceManager

    $summaryRow = Get-Row -Table $activitiesTable -Index 1 -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $summaryRow -Index 2 -NamespaceManager $namespaceManager) -Text '{{full_name_upper}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $summaryRow -Index 4 -NamespaceManager $namespaceManager) -Text '{{minimum_effort_hours}}' -NamespaceManager $namespaceManager

    $roleRow = Get-Row -Table $activitiesTable -Index 2 -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $roleRow -Index 2 -NamespaceManager $namespaceManager) -Text '{{role}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-Cell -Row $roleRow -Index 4 -NamespaceManager $namespaceManager) -Text '{{seniority_level}}' -NamespaceManager $namespaceManager

    $projectRow = Get-Row -Table $activitiesTable -Index 4 -NamespaceManager $namespaceManager
    $projectCells = @($projectRow.SelectNodes('./w:tc', $namespaceManager))
    Set-ContainerText -Container $projectCells[0] -Text '{{project_scope}}' -NamespaceManager $namespaceManager
    for ($index = 1; $index -lt $projectCells.Count; $index++) {
        Set-ContainerText -Container $projectCells[$index] -Text '' -NamespaceManager $namespaceManager
    }

    $activityRow = Get-Row -Table $activitiesTable -Index 5 -NamespaceManager $namespaceManager
    $activityCells = @($activityRow.SelectNodes('./w:tc', $namespaceManager))
    Set-ContainerText -Container $activityCells[0] -Text 'Atividade {{activity_order}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container $activityCells[1] -Text '{{activity_description}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container $activityCells[2] -Text '{{activity_reference}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container $activityCells[3] -Text '{{activity_date_start}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container $activityCells[4] -Text '{{activity_date_end}}' -NamespaceManager $namespaceManager
    Set-ContainerText -Container $activityCells[5] -Text '{{activity_status}}' -NamespaceManager $namespaceManager

    $activityRows = @($activitiesTable.SelectNodes('./w:tr', $namespaceManager))
    for ($index = $activityRows.Count - 1; $index -ge 5; $index--) {
        $null = $activitiesTable.RemoveChild($activityRows[$index])
    }

    Remove-ParagraphByExactText -Document $document -ExactText '< adicionar tantas linhas quanto necessário e replicar uma tabela para cada projeto >' -NamespaceManager $namespaceManager
    Set-ContainerText -Container (Get-ParagraphByExactText -Document $document -ExactText '< Nessa seção devem ser anexadas evidências das atividades e entregas listadas no Encarte A tais como os links de tabelas, planilhas, controles, sistemas, prints e outros meios. Caso a evidência esteja lastreada no GitLab basta inserir o link no Encarte A na coluna Referência . Os prints devem ser legíveis e, de preferência, grandes para melhor visualização. >' -NamespaceManager $namespaceManager) -Text '{{evidence_pages}}' -NamespaceManager $namespaceManager

    Ensure-UpdateFieldsOnOpen -SettingsDocument $settings -NamespaceManager $settingsNamespaceManager

    $document.Save($documentPath)
    $settings.Save($settingsPath)

    if (Test-Path -LiteralPath $OutputPath) {
        Remove-Item -LiteralPath $OutputPath -Force
    }

    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempRoot, $OutputPath)

    Write-Host "Template DOCX gerado em: $OutputPath"
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}