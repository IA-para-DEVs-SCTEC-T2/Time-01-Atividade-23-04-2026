from app.services.ticket_service import create_ticket


class TestCreateTicket:
    def test_returns_ticket_with_ticket_id(self):
        ticket = create_ticket("João Silva", "joao@example.com", "Dúvida sobre entrega")
        assert ticket.ticket_id is not None
        assert len(ticket.ticket_id) > 0

    def test_ticket_id_is_unique(self):
        t1 = create_ticket("Ana", "ana@example.com", "Dúvida 1")
        t2 = create_ticket("Ana", "ana@example.com", "Dúvida 2")
        assert t1.ticket_id != t2.ticket_id

    def test_ticket_preserves_input_data(self):
        ticket = create_ticket("Maria", "maria@example.com", "Problema com pagamento")
        assert ticket.name == "Maria"
        assert ticket.email == "maria@example.com"
        assert ticket.description == "Problema com pagamento"

    def test_ticket_has_created_at(self):
        ticket = create_ticket("Carlos", "carlos@example.com", "Status do pedido")
        assert ticket.created_at is not None


# Feature: supportbot-faq, Property 5: Tickets criados possuem identificadores únicos
from hypothesis import given, settings
import hypothesis.strategies as st
from app.models.ticket import TicketRequest
import app.repositories.ticket_repository as ticket_repo


@given(
    requests=st.lists(
        st.builds(
            TicketRequest,
            name=st.text(min_size=1).filter(lambda s: s.strip()),
            email=st.emails(),
            description=st.text(min_size=1).filter(lambda s: s.strip()),
        ),
        min_size=2,
    )
)
@settings(max_examples=100)
def test_property_5_ticket_ids_are_unique(requests):
    """Property 5: Tickets criados possuem identificadores únicos
    Validates: Requirements 3.3
    """
    # Reset in-memory store to avoid state leakage between hypothesis examples
    ticket_repo._store.clear()

    ids = [
        create_ticket(r.name, r.email, r.description).ticket_id
        for r in requests
    ]

    assert len(set(ids)) == len(ids), (
        f"Duplicate ticket_ids found: {ids}"
    )


# Feature: supportbot-faq, Property 6: Criação de ticket válido retorna estrutura completa
from starlette.testclient import TestClient
from app.main import app
import app.repositories.ticket_repository as ticket_repo


@given(
    request_data=st.builds(
        TicketRequest,
        name=st.text(min_size=1).filter(lambda s: s.strip()),
        email=st.emails(),
        description=st.text(min_size=1).filter(lambda s: s.strip()),
    )
)
@settings(max_examples=50)
def test_property_6_valid_ticket_creation_returns_complete_structure(request_data):
    """Property 6: Criação de ticket válido retorna estrutura completa
    Validates: Requirements 3.4
    """
    ticket_repo._store.clear()

    client = TestClient(app)
    payload = {
        "name": request_data.name,
        "email": str(request_data.email),
        "description": request_data.description,
    }
    response = client.post("/ticket", json=payload)

    assert response.status_code == 201

    body = response.json()
    assert "ticket_id" in body and body["ticket_id"]
    assert "message" in body and body["message"]


# Feature: supportbot-faq, Property 7: Campos obrigatórios do ticket rejeitam whitespace
@given(
    name=st.text(alphabet=st.characters(whitelist_categories=("Zs",)), min_size=1)
)
@settings(max_examples=50)
def test_property_7_whitespace_name_returns_422(name):
    """Property 7: Campos obrigatórios do ticket rejeitam whitespace — name
    Validates: Requirements 3.5, 3.6, 3.7
    """
    client = TestClient(app)
    payload = {
        "name": name,
        "email": "valid@example.com",
        "description": "Descrição válida",
    }
    response = client.post("/ticket", json=payload)
    assert response.status_code == 422, (
        f"Expected 422 for whitespace-only name={repr(name)}, got {response.status_code}"
    )


@given(
    description=st.text(alphabet=st.characters(whitelist_categories=("Zs",)), min_size=1)
)
@settings(max_examples=50)
def test_property_7_whitespace_description_returns_422(description):
    """Property 7: Campos obrigatórios do ticket rejeitam whitespace — description
    Validates: Requirements 3.5, 3.6, 3.7
    """
    client = TestClient(app)
    payload = {
        "name": "Nome Válido",
        "email": "valid@example.com",
        "description": description,
    }
    response = client.post("/ticket", json=payload)
    assert response.status_code == 422, (
        f"Expected 422 for whitespace-only description={repr(description)}, got {response.status_code}"
    )


@given(
    email=st.text(min_size=1).filter(lambda s: "@" not in s)
)
@settings(max_examples=50)
def test_property_7_invalid_email_returns_422(email):
    """Property 7: Campos obrigatórios do ticket rejeitam whitespace — invalid email
    Validates: Requirements 3.5, 3.6, 3.7
    """
    client = TestClient(app)
    payload = {
        "name": "Nome Válido",
        "email": email,
        "description": "Descrição válida",
    }
    response = client.post("/ticket", json=payload)
    assert response.status_code == 422, (
        f"Expected 422 for invalid email={repr(email)}, got {response.status_code}"
    )


# Task 14.3 — Example tests for POST /ticket endpoint
class TestPostTicketEndpoint:
    def setup_method(self):
        import app.repositories.ticket_repository as ticket_repo
        ticket_repo._store.clear()
        self.client = TestClient(app)

    def test_valid_data_returns_201_with_ticket_id(self):
        payload = {
            "name": "João Silva",
            "email": "joao@example.com",
            "description": "Dúvida sobre entrega",
        }
        response = self.client.post("/ticket", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert "ticket_id" in body
        assert body["ticket_id"]

    def test_missing_name_returns_422(self):
        payload = {
            "email": "joao@example.com",
            "description": "Dúvida sobre entrega",
        }
        response = self.client.post("/ticket", json=payload)
        assert response.status_code == 422

    def test_invalid_email_returns_422(self):
        payload = {
            "name": "João Silva",
            "email": "not-an-email",
            "description": "Dúvida sobre entrega",
        }
        response = self.client.post("/ticket", json=payload)
        assert response.status_code == 422

    def test_missing_description_returns_422(self):
        payload = {
            "name": "João Silva",
            "email": "joao@example.com",
        }
        response = self.client.post("/ticket", json=payload)
        assert response.status_code == 422
