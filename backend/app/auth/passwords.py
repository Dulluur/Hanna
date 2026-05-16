import bcrypt

ROUNDS = 12
MAX_LEN = 72

def hash_password(password: str) -> str:
    pwd = password.encode("utf-8")[:MAX_LEN]
    return bcrypt.hashpw(pwd, bcrypt.gensalt(rounds=ROUNDS)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    pwd = password.encode("utf-8")[:MAX_LEN]
    try:
        return bcrypt.checkpw(pwd, hashed.encode("utf-8"))
    except ValueError:
        return False
