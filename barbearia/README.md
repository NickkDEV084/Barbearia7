# Gama Estúdio ®

Aplicativo de agendamento para a barbearia Gama Estúdio, na região 55 da Cohab. A primeira versão reúne uma página pública para clientes e um painel administrativo protegido por login.

## Requisitos

- Python 3.10 ou superior
- `pip`

## Rodar localmente

Abra um terminal dentro de `barbearia/backend`.

### Windows PowerShell

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

### macOS ou Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000). A API e o frontend são servidos pela mesma aplicação. A documentação interativa da API fica em `/docs`.

O SQLite é criado em `backend/barbearia.db` na primeira inicialização. O seed inicial é aplicado quando o banco ainda não tem barbeiros.

## Primeiro acesso ao painel

- Endereço: `/admin/login.html`
- Usuário inicial: `admin`
- Senha inicial: `gama2026`

Configure `ADMIN_USERNAME`, `ADMIN_PASSWORD` e um `JWT_SECRET` longo e aleatório no arquivo `.env` antes da primeira inicialização. As credenciais são gravadas no banco durante o seed inicial; alterar o `.env` depois não troca a senha de uma conta que já existe.

## O que já funciona

- Página inicial, catálogo de serviços, links para Instagram e WhatsApp e fluxo público de reserva.
- Seleção de serviço, profissional, data e horário; o pedido fica pré-reservado até a confirmação no painel. Horários passados, folgas, expediente, intervalo e conflitos de duração são filtrados no backend.
- O backend serializa as gravações no SQLite e confere novamente a disponibilidade antes de confirmar o agendamento.
- Confirmação com resumo, compartilhamento pelo WhatsApp e download de evento `.ics` para a agenda.
- Painel com agenda diária ou de sete dias, filtro por profissional e status, confirmação, conclusão, remarcação e cancelamento.
- Cadastro e edição de serviços, horários e intervalos por profissional, folgas, lista de clientes e histórico.
- Indicadores de atendimentos e estimativa de faturamento, mais serviços pedidos e horários próximos.
- Seed com dois profissionais, serviços e histórico de exemplo.

Os preços, horários e clientes do seed são dados demonstrativos. Ajuste-os no painel antes de usar com clientes. Para conectar o botão do WhatsApp diretamente ao número do estúdio, substitua os links `wa.me` da página inicial pelo número oficial. As imagens do barbeiro e do estúdio são provisórias e podem ser trocadas pelos arquivos reais em `frontend/assets`.

## Estrutura

```text
backend/
  app/
    config/       configurações e variáveis de ambiente
    controllers/  orquestração e serialização das respostas
    models/       tabelas SQLAlchemy
    routes/       endpoints FastAPI
    services/     regras de negócio
frontend/
  admin/          telas do painel
  assets/         logo e imagens provisórias
  css/            estilos responsivos
  js/             integração com a API e fluxos da interface
```

## Próxima versão

Conectar o WhatsApp oficial, substituir as imagens e valores demonstrativos pelos dados reais, adicionar troca de senha no painel e publicar a aplicação em um servidor com HTTPS e cópias de segurança do SQLite.
