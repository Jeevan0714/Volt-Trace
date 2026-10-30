import hashlib
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

def calculate_sha256(file_path: Path) -> str:
    """Calculate SHA-256 hash using 64KB streaming chunks (memory safe)."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def calculate_bytes_sha256(data: bytes) -> str:
    """Calculate SHA-256 hash of bytes directly."""
    return hashlib.sha256(data).hexdigest()

def generate_ed25519_keypair() -> tuple[str, str]:
    """Generate Ed25519 private and public keys as hex strings."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    priv_hex = private_key.private_bytes_raw().hex()
    pub_hex = public_key.public_bytes_raw().hex()
    return priv_hex, pub_hex

def sign_data(private_key_hex: str, data: bytes) -> str:
    """Sign data bytes using an Ed25519 private key hex."""
    priv_bytes = bytes.fromhex(private_key_hex)
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
    signature = private_key.sign(data)
    return signature.hex()

def verify_signature(public_key_hex: str, signature_hex: str, data: bytes) -> bool:
    """Verify an Ed25519 signature."""
    try:
        pub_bytes = bytes.fromhex(public_key_hex)
        sig_bytes = bytes.fromhex(signature_hex)
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        public_key.verify(sig_bytes, data)
        return True
    except (InvalidSignature, ValueError, Exception):
        return False

def calculate_audit_chain_hash(event_type: str, actor: str, details: str, timestamp_str: str, prev_hash: str) -> str:
    """Append-only Merkle-linked audit trail hash: H(event_data + timestamp + prev_hash)"""
    payload = f"{event_type}|{actor}|{details}|{timestamp_str}|{prev_hash}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
