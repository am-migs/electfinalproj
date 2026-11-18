# Component Catalog API Integration Preparation

## Status

Not connected. This document defines the next integration phase.

## Recommended provider

Nexar (Octopart API) is a candidate for manufacturer part number searches and component metadata.

Confirm current API access, pricing, quota limits, terms, and returned fields before implementation.

## Secure request flow

1. The frontend sends an MPN query to an application-owned endpoint, such as `/api/components/search?mpn=ATmega328P-PU`.
2. A backend or serverless function validates the query and applies rate limits.
3. The backend performs OAuth using credentials stored in environment variables.
4. The backend calls the component catalog provider.
5. The backend returns only normalized component fields.
6. The user reviews the result and chooses whether to add it to local inventory.

## Suggested normalized fields

- `mpn`
- `name`
- `manufacturer`
- `description`
- `datasheet`
- `packageType`
- `footprint`
- `source`

## Security requirements

- Never commit client secrets, API keys, or access tokens.
- Keep provider credentials on the backend.
- Validate and rate-limit search requests.
- Handle timeouts, quotas, and empty results.
- Treat API results as suggestions and require user confirmation before saving.

## Existing frontend fields

The inventory form already stores MPN, component name, manufacturer, category, package, footprint, and datasheet URL.

A future lookup control can populate these fields while keeping them editable.

## Needed before implementation

- Provider account and API access.
- Client ID and secret stored in backend environment variables.
- Backend or serverless hosting target.
- Agreed fields and provider usage restrictions.