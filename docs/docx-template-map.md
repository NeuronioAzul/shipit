# ShipIt DOCX template map

Arquivo gerado:
- RELATÓRIO DE SERVIÇO - TEMPLATE.docx

Campos simples:
- {{contract_number}}
- {{contract_reference_short}}
- {{full_name}}
- {{full_name_upper}}
- {{role}}
- {{seniority_level}}
- {{report_generated_date_long}}
- {{month_reference}}
- {{attendance_presencial_checkbox}}
- {{attendance_remoto_checkbox}}
- {{attendance_hibrido_checkbox}}
- {{daily_availability}}
- {{monthly_availability}}
- {{profile_type}}
- {{correlating_activities}}
- {{minimum_effort_hours}}

Encarte A:
- A terceira tabela do documento e o modelo de tabela por projeto.
- A linha 4 dessa tabela e a linha-ancora do projeto e usa {{project_scope}}.
- A linha 5 dessa tabela e a linha-ancora de atividade e usa:
  - Atividade {{activity_order}}
  - {{activity_description}}
  - {{activity_reference}}
  - {{activity_date_start}}
  - {{activity_date_end}}
  - {{activity_status}}
- Para gerar varios projetos, a automacao deve clonar a tabela inteira do Encarte A e preencher uma copia por projeto.
- Para gerar varias atividades dentro de um projeto, a automacao deve clonar a linha 5 da tabela desse projeto.

Encarte B:
- O paragrafo {{evidence_pages}} e a ancora para inserir todas as paginas de evidencia.
- Cada evidencia deve virar uma pagina propria com imagem e legenda.
- O campo {{activity_reference}} deve receber o texto final para o relatorio, por exemplo: Paginas 3, 4 e 5.

Notas de automacao:
- O template preserva o layout institucional do modelo original.
- O arquivo foi configurado para atualizar campos do Word ao abrir, incluindo indice e referencias baseadas em campos.
- O arquivo original RELATÓRIO DE SERVIÇO - ENGENHEIRO DE SOFTWARE.docx permanece intacto.