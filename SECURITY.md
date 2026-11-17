# Security and configuration

Never commit live credentials. Copy `config/.env.example` to `config/.env` and fill it locally.

## Required action for the repository owner

An environment file was previously committed to this public repository. Removing it from the latest revision does not remove historical copies. Treat any real credentials that appeared there as compromised:

1. Revoke and replace any exposed AWS access keys and email app passwords.
2. Rotate all JWT signing secrets; existing sessions will need to sign in again.
3. Rotate any database credentials and other provider credentials that appeared in that file.
4. Check the relevant providers' access logs and permissions.
5. After rotation, evaluate removing sensitive historical data from Git history. Coordinate this with collaborators before rewriting history.

Do not paste old or new secret values into issues, pull requests, screenshots or chat.

The test suite uses synthetic credentials and a temporary database. Email and S3 operations are stubbed. Real provider integrations still need validation in an environment owned by the maintainer.
