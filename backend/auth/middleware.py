"""Authentication middleware for protecting Flask routes."""

from functools import wraps
from flask import request, jsonify
from database.supabase_client import get_supabase


def require_auth(f):
    """
    Decorator to require authentication for Flask routes.

    Usage:
        @app.route('/api/protected')
        @require_auth
        def protected_route():
            user_id = request.user_id  # Access the authenticated user's ID
            return jsonify({"message": f"Hello {user_id}"})

    The decorator:
    1. Extracts the JWT token from the Authorization header
    2. Verifies the token with Supabase Auth
    3. Sets request.user_id to the authenticated user's ID
    4. Returns 401 if authentication fails
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "No authorization token provided"}), 401

        token = auth_header.split(' ')[1]

        # Verify token with Supabase
        supabase = get_supabase()
        try:
            # Get user from token
            user_response = supabase.auth.get_user(token)

            if not user_response or not user_response.user:
                return jsonify({"error": "Invalid token"}), 401

            # Set user_id on request object for use in route handler
            request.user_id = user_response.user.id

        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return f(*args, **kwargs)

    return decorated_function
