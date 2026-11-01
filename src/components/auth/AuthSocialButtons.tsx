'use client';

import { useState } from 'react';
import { useSignIn, useSignUp, useClerk } from '@clerk/nextjs';

export type SupportedOAuthStrategy =
  | 'oauth_google'
  | 'oauth_microsoft'
  | 'oauth_apple'
  | 'oauth_github'
  | 'oauth_linkedin_oidc';

interface AuthSocialButtonsProps {
  mode: 'sign-in' | 'sign-up';
  redirectUrl?: string;
  onError?: (message: string) => void;
}

interface SocialProviderConfig {
  id: string;
  name: string;
  strategy: SupportedOAuthStrategy;
  icon: (props: { className?: string }) => React.JSX.Element;
}

const PROVIDERS: SocialProviderConfig[] = [
  {
    id: 'google',
    name: 'Google',
    strategy: 'oauth_google',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    strategy: 'oauth_microsoft',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
      </svg>
    ),
  },
  {
    id: 'apple',
    name: 'Apple',
    strategy: 'oauth_apple',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 1.01-2.87-.96.04-2.12.64-2.8 1.44-.59.69-1.11 1.76-.97 2.82 1.07.08 2.14-.58 2.76-1.39z" />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub',
    strategy: 'oauth_github',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    strategy: 'oauth_linkedin_oidc',
    icon: ({ className = 'h-5 w-5' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    ),
  },
];

export function AuthSocialButtons({
  mode,
  redirectUrl = '/',
  onError,
}: AuthSocialButtonsProps) {
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Inspect Clerk's internal environment to check if a provider is enabled and authenticatable
  const socialConfig = (
    clerk as unknown as {
      __internal_environment?: {
        userSettings?: {
          social?: Record<string, { enabled?: boolean; authenticatable?: boolean }>;
        };
      };
    }
  )?.__internal_environment?.userSettings?.social;

  const isProviderActive = (strategy: SupportedOAuthStrategy): boolean => {
    if (!socialConfig) return true; // optimistic fallback while loading
    const setting = socialConfig[strategy];
    return Boolean(setting?.enabled && setting?.authenticatable);
  };

  const handleOAuth = async (provider: SocialProviderConfig) => {
    if (loadingProvider) return;

    // Check ahead of time if the strategy is enabled in this Clerk instance
    if (socialConfig && !isProviderActive(provider.strategy)) {
      const setting = socialConfig[provider.strategy];
      let msg: string;
      if (setting?.enabled && !setting?.authenticatable) {
        msg = `${provider.name} is configured for account linking only. In your Clerk Dashboard, go to Configure → User & Authentication → Social Connections, click ${provider.name}, and enable "Enable for sign-up and sign-in".`;
      } else {
        msg = `${provider.name} sign-in is not enabled in your Clerk Dashboard. Go to Configure → User & Authentication → Social Connections in Clerk and toggle ${provider.name} ON.`;
      }
      if (onError) onError(msg);
      return;
    }

    setLoadingProvider(provider.id);

    // Safety timeout to prevent permanent spinner if navigation is cancelled or blocked
    const safetyTimer = setTimeout(() => {
      setLoadingProvider((curr) => (curr === provider.id ? null : curr));
    }, 8000);

    try {
      const client = clerk.client;

      if (mode === 'sign-in') {
        if (client?.signIn && typeof client.signIn.authenticateWithRedirect === 'function') {
          await client.signIn.authenticateWithRedirect({
            strategy: provider.strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: redirectUrl,
          });
          return;
        }

        if (
          signIn &&
          'authenticateWithRedirect' in signIn &&
          typeof (signIn as unknown as { authenticateWithRedirect?: Function })?.authenticateWithRedirect === 'function'
        ) {
          await (signIn as unknown as { authenticateWithRedirect: Function }).authenticateWithRedirect({
            strategy: provider.strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: redirectUrl,
          });
          return;
        }

        if (signIn?.sso) {
          const result = await signIn.sso({
            strategy: provider.strategy,
            redirectUrl,
            redirectCallbackUrl: '/sso-callback',
          });

          if (result?.error) {
            throw new Error(result.error.message || 'Could not initiate social sign in.');
          }
          return;
        }

        throw new Error('Sign-in service is initializing. Please try again in a moment.');
      } else {
        if (client?.signUp && typeof client.signUp.authenticateWithRedirect === 'function') {
          await client.signUp.authenticateWithRedirect({
            strategy: provider.strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: redirectUrl,
          });
          return;
        }

        if (
          signUp &&
          'authenticateWithRedirect' in signUp &&
          typeof (signUp as unknown as { authenticateWithRedirect?: Function })?.authenticateWithRedirect === 'function'
        ) {
          await (signUp as unknown as { authenticateWithRedirect: Function }).authenticateWithRedirect({
            strategy: provider.strategy,
            redirectUrl: '/sso-callback',
            redirectUrlComplete: redirectUrl,
          });
          return;
        }

        if (signUp?.sso) {
          const result = await signUp.sso({
            strategy: provider.strategy,
            redirectUrl,
            redirectCallbackUrl: '/sso-callback',
          });

          if (result?.error) {
            throw new Error(result.error.message || 'Could not initiate social sign up.');
          }
          return;
        }

        throw new Error('Sign-up service is initializing. Please try again in a moment.');
      }
    } catch (err: unknown) {
      clearTimeout(safetyTimer);
      setLoadingProvider(null);
      const anyErr = err as {
        errors?: Array<{
          code?: string;
          message?: string;
          longMessage?: string;
          meta?: { param_name?: string };
        }>;
        message?: string;
      };

      const clerkError = anyErr?.errors?.[0];
      const rawMsg =
        clerkError?.longMessage ||
        clerkError?.message ||
        anyErr?.message ||
        'Could not initiate social login.';

      const isStrategyNotAllowed =
        clerkError?.code === 'form_param_value_invalid' ||
        clerkError?.meta?.param_name === 'strategy' ||
        rawMsg.toLowerCase().includes('strategy') ||
        rawMsg.toLowerCase().includes('allowed values') ||
        rawMsg.toLowerCase().includes('not match one of');

      let userFriendlyMessage = rawMsg;

      if (
        isStrategyNotAllowed ||
        clerkError?.code === 'form_identifier_not_found' ||
        rawMsg.toLowerCase().includes('not enabled') ||
        rawMsg.toLowerCase().includes('not supported')
      ) {
        userFriendlyMessage = `${provider.name} sign-in is not enabled in your Clerk Dashboard yet. Go to Configure → User & Authentication → Social Connections in Clerk to toggle ${provider.name} ON, or sign in with Google or Work Email.`;
      } else if (
        clerkError?.code === 'account_linking_only' ||
        rawMsg.toLowerCase().includes('linking')
      ) {
        userFriendlyMessage = `${provider.name} is configured for account linking only. In Clerk Dashboard, enable sign-in for ${provider.name}, or sign in with Google or Work Email.`;
      }

      if (onError) {
        onError(userFriendlyMessage);
      }
    }
  };

  return (
    <div className="grid grid-cols-5 gap-2.5">
      {PROVIDERS.map((provider) => {
        const Icon = provider.icon;
        const isLoading = loadingProvider === provider.id;
        const isActive = isProviderActive(provider.strategy);

        return (
          <button
            key={provider.id}
            type="button"
            disabled={!!loadingProvider}
            onClick={() => handleOAuth(provider)}
            title={
              isActive
                ? `Continue with ${provider.name}`
                : `Continue with ${provider.name} (Requires enabling in Clerk Dashboard)`
            }
            aria-label={`Continue with ${provider.name}`}
            className="group relative flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-neutral-900/70 p-2 text-white transition-all duration-150 hover:border-white/25 hover:bg-neutral-800/80 hover:shadow-lg hover:shadow-black/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
            ) : (
              <Icon className="h-5 w-5 transition-transform duration-150 group-hover:scale-105" />
            )}
          </button>
        );
      })}
    </div>
  );
}

