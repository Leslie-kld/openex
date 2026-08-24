from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.tools import tool
from tools import get_wallet_balance

SYSTEM_PROMPT = """You are OpenEx's trading assistant. You help users understand
their simulated crypto exchange account — balances, orders, and general trading
concepts. If the user asks about their balance, use the get_balance tool.
Keep answers concise and factual. This is a simulated educational exchange,
not real financial advice."""

OLLAMA_MODEL = "llama3.2"


def get_chat_response(user_message: str, jwt_token: str | None = None) -> str:
    @tool
    def get_balance() -> str:
        """Get the user's current wallet balance."""
        if not jwt_token:
            return "User is not authenticated, cannot fetch balance."
        return get_wallet_balance(jwt_token)

    try:
        llm = ChatOllama(model=OLLAMA_MODEL, temperature=0.3, client_kwargs={"timeout": 30})
        llm_with_tools = llm.bind_tools([get_balance])

        messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_message)]
        ai_response = llm_with_tools.invoke(messages)

        if ai_response.tool_calls:
            tool_result = get_balance.invoke(ai_response.tool_calls[0]["args"])
            messages.append(ai_response)
            messages.append(HumanMessage(content=f"Tool result: {tool_result}"))
            final_response = llm.invoke(messages)
            return final_response.content or "I couldn't generate a response for that."

        return ai_response.content or "I couldn't generate a response for that."

    except Exception as e:
        err = str(e).lower()
        if "connection" in err or "connect" in err:
            return (
                "I can't reach the local AI model right now. Make sure Ollama is "
                "running (`ollama serve`) and that the model is pulled "
                f"(`ollama pull {OLLAMA_MODEL}`)."
            )
        if "not found" in err or "404" in err:
            return (
                f"The model '{OLLAMA_MODEL}' isn't available in Ollama. "
                f"Run `ollama pull {OLLAMA_MODEL}` and try again."
            )
        # Fall back to a generic, still-visible error rather than crashing the request.
        return f"Something went wrong talking to the AI assistant: {e}"
