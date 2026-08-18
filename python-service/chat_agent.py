from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from tools import get_wallet_balance

SYSTEM_PROMPT = """You are OpenEx's trading assistant. You help users understand
their simulated crypto exchange account — balances, orders, and general trading
concepts. If the user asks about their balance, use the get_balance tool.
Keep answers concise and factual. This is a simulated educational exchange,
not real financial advice."""


def get_chat_response(user_message: str, jwt_token: str | None = None) -> str:
    @tool
    def get_balance() -> str:
        """Get the user's current wallet balance."""
        if not jwt_token:
            return "User is not authenticated, cannot fetch balance."
        return get_wallet_balance(jwt_token)

    llm = ChatOllama(model="llama3.2", temperature=0.3)
    llm_with_tools = llm.bind_tools([get_balance])

    messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_message)]
    ai_response = llm_with_tools.invoke(messages)

    print("DEBUG tool_calls:", ai_response.tool_calls)  # temporary

    if ai_response.tool_calls:
        tool_result = get_balance.invoke(ai_response.tool_calls[0]["args"])
        print("DEBUG tool_result:", tool_result)  # temporary
        messages.append(ai_response)
        messages.append(HumanMessage(content=f"Tool result: {tool_result}"))
        final_response = llm.invoke(messages)
        return final_response.content

    return ai_response.content