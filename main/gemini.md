# Documentação do Projeto: Dashboard de Análise de Eventos

Este documento fornece uma visão geral do projeto, sua estrutura e como executá-lo.

## Visão Geral do Projeto

Este é um dashboard de monetização e análise de eventos, projetado para visualizar dados do Google Analytics. O projeto é composto por duas partes principais:

1.  **Scripts de Extração de Dados:** Um conjunto de scripts Node.js (`extrator_*.js`) responsáveis por buscar dados históricos do Google Analytics e salvá-los localmente em arquivos CSV.
2.  **Servidor Web e Dashboard:** Uma aplicação Express.js (`server.js`) que serve uma interface de frontend e uma API. O frontend consome a API para exibir os dados dos arquivos CSV em um dashboard interativo, permitindo a análise de jornadas de usuário, funis e correlações de eventos.

## Estrutura do Projeto

-   `server.js`: O servidor web principal (backend) que serve os arquivos do frontend e a API de dados.
-   `index.html`: O arquivo principal do frontend (o dashboard).
-   `extrator_eventos.js`, `extrator_skus.js`, `extrator_telas.js`: Scripts para extrair diferentes tipos de dados do Google Analytics.
-   `historico_*.csv`: Arquivos de dados gerados pelos scripts de extração.
-   `jornadas.json`: Arquivo de configuração para definir as jornadas de usuário a serem analisadas no dashboard.
-   `config.html`, `config_eventos.html`: Páginas de configuração para editar os arquivos JSON.
-   `package.json`: Define as dependências do projeto e os scripts.
-   `config_headers.js`: Arquivo de configuração para as credenciais de autenticação da API do Google Analytics.

## Setup

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Configurar autenticação:**
    -   Abra o arquivo `config_headers.js`.
    -   Você precisará obter um `Cookie` e um `token XSRF` da sua sessão do Google Analytics.
    -   Substitua os valores de `SEU_COOKIE` e `SEU_TOKEN_XSRF` no arquivo com as suas credenciais.

## Executando o Projeto

1.  **Extrair os dados do Google Analytics:**
    Execute os scripts de extração para popular os arquivos CSV. Por exemplo, para extrair os eventos:
    ```bash
    node extrator_eventos.js
    ```
    *Observação: Pode ser necessário executar os outros extratores (`extrator_skus.js`, `extrator_telas.js`) também.*

2.  **Iniciar o servidor do dashboard:**
    Após a extração dos dados, inicie o servidor web:
    ```bash
    npm start
    ```

3.  **Acessar o dashboard:**
    Abra seu navegador e acesse `http://localhost:3000`.