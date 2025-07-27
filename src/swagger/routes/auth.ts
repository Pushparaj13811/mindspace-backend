export const authPaths = {
  '/api/v1/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user',
      description: 'Creates a new user account with email and password. Sends verification and welcome emails.',
      operationId: 'register',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RegisterRequest'
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'User successfully registered',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid input data',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '409': {
          description: 'User already exists',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticates user with email and password and returns access tokens',
      operationId: 'login',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/LoginRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Generates a new access token using the refresh token',
      operationId: 'refreshToken',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/RefreshTokenRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Token refreshed successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      session: {
                        $ref: '#/components/schemas/AuthTokens'
                      }
                    }
                  },
                  message: { type: 'string' as const, example: 'Token refreshed successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': {
          description: 'Invalid or expired refresh token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Invalidates the current session and blacklists the token',
      operationId: 'logout',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user profile',
      description: 'Returns the authenticated user\'s profile information',
      operationId: 'getCurrentUser',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'User profile retrieved',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/profile': {
    put: {
      tags: ['Auth'],
      summary: 'Update user profile',
      description: 'Updates the authenticated user\'s profile information',
      operationId: 'updateProfile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateProfileRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Profile updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  },
                  message: { type: 'string' as const, example: 'Profile updated successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    },
    patch: {
      tags: ['Auth'],
      summary: 'Update user profile (PATCH)',
      description: 'Updates the authenticated user\'s profile information using PATCH method',
      operationId: 'patchProfile',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdateProfileRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Profile updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      user: {
                        $ref: '#/components/schemas/User'
                      }
                    }
                  },
                  message: { type: 'string' as const, example: 'Profile updated successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/preferences': {
    put: {
      tags: ['Auth'],
      summary: 'Update user preferences',
      description: 'Updates the authenticated user\'s preferences (theme, notifications, etc.)',
      operationId: 'updatePreferences',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UpdatePreferencesRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Preferences updated successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid input',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/password': {
    put: {
      tags: ['Auth'],
      summary: 'Change user password',
      description: 'Changes the authenticated user\'s password',
      operationId: 'changePassword',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ChangePasswordRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password changed successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid password format',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'Invalid current password',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Request password reset',
      description: 'Sends a password reset email to the user',
      operationId: 'requestPasswordReset',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PasswordResetRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password reset email sent',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '404': {
          description: 'User not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/confirm-password-reset': {
    post: {
      tags: ['Auth'],
      summary: 'Confirm password reset',
      description: 'Resets user password using the token from the reset email',
      operationId: 'confirmPasswordReset',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/PasswordResetConfirmRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'Password reset successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/verify-email': {
    get: {
      tags: ['Auth'],
      summary: 'Verify email address',
      description: 'Confirms email verification using the custom token sent to user\'s email',
      operationId: 'verifyEmail',
      parameters: [
        {
          name: 'token',
          in: 'query',
          required: true,
          description: 'Verification token from email',
          schema: {
            type: 'string' as const
          }
        }
      ],
      responses: {
        '200': {
          description: 'Email verified successfully',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid or expired token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/resend-verification': {
    post: {
      tags: ['Auth'],
      summary: 'Resend email verification',
      description: 'Sends a new email verification link to the authenticated user',
      operationId: 'resendVerification',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'Verification email sent',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SuccessResponse'
              }
            }
          }
        },
        '400': {
          description: 'Email already verified',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/oauth2/initiate': {
    post: {
      tags: ['Auth'],
      summary: 'Initiate OAuth2 authentication',
      description: 'Initiates the OAuth2 authentication flow with Google. Returns a redirect URL for user authentication.',
      operationId: 'initiateOAuth2',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/OAuth2InitiateRequest'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'OAuth2 session created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' as const, example: true },
                  data: {
                    type: 'object' as const,
                    properties: {
                      redirectUrl: {
                        type: 'string' as const,
                        format: 'uri',
                        example: 'https://accounts.google.com/oauth/authorize?...'
                      }
                    }
                  },
                  message: { type: 'string' as const, example: 'OAuth2 session created successfully' },
                  timestamp: { type: 'string' as const, format: 'date-time' }
                }
              }
            }
          }
        },
        '400': {
          description: 'Invalid provider or configuration',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  },
  '/api/v1/auth/oauth2/callback': {
    get: {
      tags: ['Auth'],
      summary: 'Handle OAuth2 callback',
      description: 'Processes the OAuth2 callback from Google and creates a user session',
      operationId: 'handleOAuth2Callback',
      parameters: [
        {
          name: 'userId',
          in: 'query',
          required: true,
          description: 'User ID returned by OAuth2 provider',
          schema: {
            type: 'string' as const
          }
        },
        {
          name: 'secret',
          in: 'query',
          required: true,
          description: 'Secret token for session validation',
          schema: {
            type: 'string' as const
          }
        }
      ],
      responses: {
        '200': {
          description: 'OAuth2 authentication successful',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AuthResponse'
              }
            }
          }
        },
        '400': {
          description: 'Invalid callback parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        },
        '401': {
          description: 'OAuth2 session expired or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              }
            }
          }
        }
      }
    }
  }
};