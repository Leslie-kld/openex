from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from tools import get_wallet_balance

SYSTEM_PROMPT = """You are OpenEx's trading assistant. You help users understand
their simulated crypto exchange account — balances, orders, and general trading
concepts. Keep answers concise and factual. This is a simulated educational
exchange, not real financial advice."""

# Keywords that must appear before we even offer the balance tool to the model.
# This is a hard gate in code — more reliable than a prompt instruction alone,
# since small local models (like llama3.2) can call bound tools speculatively
# regardless of what the system prompt says.
BALANCE_KEYWORDS = ("balance", "funds", "wallet", "how much money", "how much do i have")


def get_chat_response(user_message: str, jwt_token: str | None = None) -> str:
    llm = ChatOllama(model="llama3.2", temperature=0.3)
    messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_message)]

    wants_balance = any(kw in user_message.lower() for kw in BALANCE_KEYWORDS)

    if not wants_balance:
        # No balance-related keywords — never expose the tool at all, so the
        # model has nothing to speculatively call.
        response = llm.invoke(messages)
        return response.content

    @tool
    def get_balance() -> str:
        """Get the user's current wallet balance."""
        if not jwt_token:
            return "User is not authenticated, cannot fetch balance."
        return get_wallet_balance(jwt_token)

    llm_with_tools = llm.bind_tools([get_balance])
    ai_response = llm_with_tools.invoke(messages)

    if ai_response.tool_calls:
        tool_result = get_balance.invoke(ai_response.tool_calls[0]["args"])
        messages.append(ai_response)
        messages.append(HumanMessage(content=f"Tool result: {tool_result}"))
        final_response = llm.invoke(messages)
        return final_response.content

    return ai_response.content