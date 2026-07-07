/*
# Fix SECURITY DEFINER Function Exposure

1. Problem
- `public.update_updated_at_column()` is a SECURITY DEFINER trigger function that was exposed as an RPC endpoint via the PostgREST API.
- Both `anon` and `authenticated` roles could execute it directly through `/rest/v1/rpc/update_updated_at_column`.

2. Fix
- Revoke EXECUTE privileges on the function from `anon` and `authenticated` roles.
- The function remains usable by triggers (which run as the table owner) but is no longer callable directly via the REST API.
*/

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
