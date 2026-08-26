# Authentication

Driver/admin accounts use short-lived JWT access tokens and rotating server-side refresh sessions. Screen Players use device tokens bound to a display. Device tokens are never returned by admin endpoints or placed in browser storage. Production requires a non-default JWT secret and disables mock OTP.
