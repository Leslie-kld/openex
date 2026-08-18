import requests

def get_wallet_balance(jwt_token: str) -> str:
    """Fetches the user's current USD wallet balance from the OpenEx backend."""
    try:
        response = requests.get(
            "http://localhost:8080/api/wallets",
            headers={"Authorization": f"Bearer {jwt_token}"},
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
        return f"Balance: ${data['balance']} {data['currency']}"
    except requests.RequestException as e:
        return f"Could not fetch balance: {e}"