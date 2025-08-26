# MMT API Error Codes Documentation

## Overview

The MMT API uses standardized error responses with consistent error codes and HTTP status codes. All errors follow a common format for easy handling by API consumers.

## Error Response Format

All error responses follow this structure:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "timestamp": "2025-08-26T10:30:00.000Z"
  }
}
```

In development mode, additional fields are included:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "timestamp": "2025-08-26T10:30:00.000Z",
    "details": { /* Additional context */ },
    "stack": "Error stack trace",
    "path": "/api/endpoint",
    "method": "GET"
  }
}
```

## Error Codes

### Configuration Errors (5xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `CONFIG_ERROR` | 500 | General configuration error | Invalid configuration format |
| `CONFIG_INVALID` | 500 | Configuration validation failed | Missing required fields |
| `CONFIG_MISSING` | 500 | Configuration file not found | Config file doesn't exist |

### Validation Errors (4xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Invalid request body |
| `INVALID_INPUT` | 400 | Input format is incorrect | Malformed JSON |
| `INVALID_FORMAT` | 400 | Data format is invalid | Invalid date format |

### Resource Errors (4xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `NOT_FOUND` | 404 | Resource not found | Document doesn't exist |
| `ALREADY_EXISTS` | 409 | Resource already exists | Duplicate file name |

### Authentication & Authorization (4xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `UNAUTHORIZED` | 401 | Authentication required | Missing auth token |
| `FORBIDDEN` | 403 | Access denied | Insufficient permissions |

### File System Errors (5xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `FILESYSTEM_ERROR` | 500 | File system operation failed | Disk write error |
| `FILE_NOT_FOUND` | 404 | File not found | Document file missing |
| `PERMISSION_DENIED` | 403 | File access denied | No read permission |

### Vault Errors (4xx/5xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `VAULT_ERROR` | 500 | Vault operation failed | Vault initialization error |
| `VAULT_NOT_FOUND` | 404 | Vault doesn't exist | Invalid vault ID |
| `VAULT_UNAVAILABLE` | 503 | Vault is not ready | Vault still indexing |

### Operation Errors (5xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `OPERATION_ERROR` | 500 | Operation execution failed | Rename operation failed |
| `OPERATION_FAILED` | 500 | Operation completed with errors | Partial operation failure |

### System Errors (5xx)

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `INTERNAL_ERROR` | 500 | Internal server error | Unexpected system error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Server overloaded |
| `TIMEOUT_ERROR` | 504 | Operation timed out | Long-running query timeout |
| `RATE_LIMIT_ERROR` | 429 | Rate limit exceeded | Too many requests |

### Other Errors

| Code | HTTP Status | Description | Example |
|------|------------|-------------|---------|
| `UNKNOWN_ERROR` | 500 | Unknown error occurred | Unexpected error type |

## Error Handling Examples

### TypeScript/JavaScript

```typescript
interface ApiError {
  error: {
    message: string;
    code: string;
    timestamp: string;
    details?: any;
  };
}

async function fetchDocuments() {
  try {
    const response = await fetch('/api/vaults/default/documents');
    
    if (!response.ok) {
      const error: ApiError = await response.json();
      
      switch (error.error.code) {
        case 'VAULT_NOT_FOUND':
          console.error('Vault does not exist');
          break;
        case 'UNAUTHORIZED':
          console.error('Please authenticate');
          break;
        case 'RATE_LIMIT_ERROR':
          console.error('Too many requests, please wait');
          break;
        default:
          console.error('API Error:', error.error.message);
      }
      return;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

### Python

```python
import requests
from typing import Optional, Dict, Any

def handle_api_error(response: requests.Response) -> None:
    """Handle API error responses"""
    if response.status_code >= 400:
        try:
            error_data = response.json()
            error = error_data.get('error', {})
            
            error_code = error.get('code', 'UNKNOWN_ERROR')
            message = error.get('message', 'Unknown error')
            
            if error_code == 'VAULT_NOT_FOUND':
                raise ValueError(f"Vault not found: {message}")
            elif error_code == 'UNAUTHORIZED':
                raise PermissionError(f"Authentication required: {message}")
            elif error_code == 'RATE_LIMIT_ERROR':
                raise RuntimeError(f"Rate limit exceeded: {message}")
            else:
                raise Exception(f"API Error [{error_code}]: {message}")
        except ValueError:
            # Response is not JSON
            raise Exception(f"HTTP {response.status_code}: {response.text}")

def get_documents(vault_id: str = 'default') -> Optional[Dict[str, Any]]:
    """Fetch documents from the API"""
    response = requests.get(f'http://localhost:3001/api/vaults/{vault_id}/documents')
    
    if response.ok:
        return response.json()
    else:
        handle_api_error(response)
        return None
```

## Best Practices

1. **Always check the error code** - Don't rely solely on HTTP status codes
2. **Handle specific errors** - Implement specific handling for expected error codes
3. **Log errors appropriately** - Include the error code and message in your logs
4. **Retry with backoff** - For `RATE_LIMIT_ERROR` and `SERVICE_UNAVAILABLE`, implement exponential backoff
5. **Don't expose error details** - In production, avoid showing stack traces to end users

## Migration Guide

If you're migrating from the old error format to the new standardized format:

### Old Format
```json
{
  "error": "Something went wrong"
}
```

### New Format
```json
{
  "error": {
    "message": "Something went wrong",
    "code": "OPERATION_ERROR",
    "timestamp": "2025-08-26T10:30:00.000Z"
  }
}
```

### Migration Steps

1. Update error parsing to handle the nested error object
2. Check for both old and new formats during transition
3. Use the error code for programmatic error handling
4. Display the message to users

## Support

For questions about error codes or to report issues:
- Open an issue on GitHub
- Check the API documentation for endpoint-specific errors
- Review the error details in development mode for more context