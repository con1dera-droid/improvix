# Catálogo de Módulos — ImprovisaLab

| Módulo | Tipo | Entra na etapa | Descrição |
|---|---|---|---|
| Motor de Teoria Musical | Core | 1 | Calcula campo harmônico, função dos acordes, escalas, arpejos e notas-alvo. Base de tudo. |
| Análise (Visão Geral / Escalas / Arpejos / Notas-alvo) | Core | 1 | Telas que exibem o resultado do motor para teclado, guitarra e baixo. |
| Fraseados | Opcional (flag `fraseados`) | 2 | Biblioteca de frases prontas por acorde/escala, com tablatura/cifra/partitura. |
| Áudio | Opcional (flag `audio`) | 3 | Toca a progressão (backing) e cada fraseado via síntese no navegador. |
| Contas de usuário / Login | Opcional (flag `contas`) | 4 | Cadastro, login, sessão. Pré-requisito dos módulos abaixo. |
| Histórico | Opcional (flag `historico`, depende de `contas`) | 4 | Guarda as análises feitas pelo usuário logado. |
| Favoritos | Opcional (flag `favoritos`, depende de `contas`) | 4 | Marcar análises/fraseados como favoritos. |
| Meus Exercícios | Opcional (flag `exercicios`, depende de `contas`) | 4 | Exercícios salvos e progresso do usuário. |
| Planos (Gratuito/Pro) | Opcional (flag `planos`, depende de `contas`) | 4/5 | Controla o que cada usuário pode acessar (ex.: fraseados avançados, Laboratório). |
| Mais instrumentos (violão, sax, trompete, violino, flauta) | Opcional (flag `instrumentos_extra`) | 5 | Expande o motor e as telas para os instrumentos restantes da barra inferior do layout. |
| Laboratório | Opcional (flag `laboratorio`) | 5 | Recursos experimentais/avançados, exclusivo Pro. |
| Aulas | Opcional (flag `aulas`) | 5 | Conteúdo educacional estruturado. |
| Biblioteca de Escalas / Biblioteca de Fraseados (navegação livre) | Opcional (flag `bibliotecas`) | 5 | Telas de consulta livre, fora do fluxo de "analisar uma progressão". |

Regra: nenhum módulo opcional é ativado por padrão além do que a etapa atual
exige — cada novo módulo liga sua própria flag, sem tocar nos módulos core já
em produção.
