##Stack principal
- Linguagem: Python 3

- LLM: Claude Haiku 4.5

- API sugerida: FastAPI

- Validação de dados: Pydantic

- Cliente HTTP: httpx

- Testes: pytest

- Configuração: python-dotenv

##Diretrizes técnicas
- Priorizar arquitetura simples e fácil de manter.

- Separar claramente rotas, serviços, repositórios e modelos.

- Usar type hints em funções públicas e camadas de serviço.

- Centralizar configurações em config.py e variáveis de ambiente.

- Isolar o provedor de LLM em uma camada própria para facilitar troca futura.