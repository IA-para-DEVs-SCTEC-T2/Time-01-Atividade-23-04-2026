from app.models.faq import FAQ
from app.services.faq_service import find_relevant_faq


def make_faq(id: str, keywords: list[str]) -> FAQ:
    return FAQ(
        id=id,
        category="test",
        question="Pergunta de teste",
        answer="Resposta de teste",
        keywords=keywords,
    )


class TestFindRelevantFaq:
    def test_returns_faq_on_keyword_match(self):
        faqs = [
            make_faq("1", ["entrega", "prazo"]),
            make_faq("2", ["troca", "devolução"]),
        ]
        result = find_relevant_faq("qual o prazo de entrega?", faqs)
        assert result is not None
        assert result.id == "1"

    def test_returns_none_when_no_match(self):
        faqs = [
            make_faq("1", ["entrega", "prazo"]),
            make_faq("2", ["troca", "devolução"]),
        ]
        result = find_relevant_faq("como cancelo meu pedido?", faqs)
        assert result is None

    def test_returns_faq_with_most_keyword_matches(self):
        faqs = [
            make_faq("1", ["entrega", "prazo", "envio"]),
            make_faq("2", ["entrega"]),
        ]
        result = find_relevant_faq("prazo de entrega e envio", faqs)
        assert result is not None
        assert result.id == "1"

    def test_returns_none_for_empty_faq_list(self):
        result = find_relevant_faq("qual o prazo?", [])
        assert result is None

    def test_keyword_match_is_case_insensitive(self):
        faqs = [make_faq("1", ["Entrega"])]
        result = find_relevant_faq("entrega rápida", faqs)
        assert result is not None
        assert result.id == "1"


# Feature: supportbot-faq, Property 8: Round-trip de serialização de FAQ preserva dados
# Validates: Requirements 4.5
from hypothesis import given
from hypothesis import strategies as st


@given(
    st.builds(
        FAQ,
        id=st.text(min_size=1),
        category=st.text(min_size=1),
        question=st.text(min_size=1),
        answer=st.text(min_size=1),
        keywords=st.lists(st.text()),
    )
)
def test_faq_serialization_round_trip(faq: FAQ):
    assert FAQ.model_validate(faq.model_dump()) == faq


# Feature: supportbot-faq, Property 4: FAQ_Service retorna apenas FAQs da lista fornecida
# Validates: Requirements 1.2
from hypothesis import given
from hypothesis import strategies as st


@given(
    faqs=st.lists(
        st.builds(
            FAQ,
            id=st.text(min_size=1),
            category=st.text(min_size=1),
            question=st.text(min_size=1),
            answer=st.text(min_size=1),
            keywords=st.lists(st.text(min_size=1), min_size=1),
        )
    ),
    message=st.text(),
)
def test_property_4_faq_service_returns_only_faqs_from_input(faqs, message):
    result = find_relevant_faq(message, faqs)
    assert result is None or result in faqs
