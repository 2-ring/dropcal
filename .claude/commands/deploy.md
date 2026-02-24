Deploy the application to production. Argument: $ARGUMENTS (backend, web/frontend, or both/all/empty for everything).

## Steps

### Backend (if $ARGUMENTS contains "backend", "back", "all", "both", or is empty)

1. `cd backend && eb deploy dropcal-prod`
2. Wait for completion and verify the deploy succeeded

### Web (if $ARGUMENTS contains "web", "frontend", "front", "all", "both", or is empty)

1. `cd web && npm run build`
2. `cd web && aws s3 sync dist/ s3://dropcal-frontend --delete`
3. `aws cloudfront create-invalidation --distribution-id EULFJVVYHCA7 --paths "/*"`
4. Verify the sync and invalidation completed successfully

Report the result of each deployment step.
