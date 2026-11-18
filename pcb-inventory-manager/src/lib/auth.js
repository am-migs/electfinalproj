import { requireSupabase } from "./supabase.js";

export async function signUp({ email, password, fullName }) {
  const client = requireSupabase();

  return client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() }
    }
  });
}

export async function signIn({ email, password }) {
  const client = requireSupabase();

  return client.auth.signInWithPassword({
    email: email.trim(),
    password
  });
}

export async function signOut() {
  const client = requireSupabase();
  return client.auth.signOut();
}

export async function requestPasswordReset(email, redirectTo) {
  const client = requireSupabase();

  return client.auth.resetPasswordForEmail(email.trim(), {
    redirectTo
  });
}

export async function getCurrentSession() {
  const client = requireSupabase();
  return client.auth.getSession();
}

export function subscribeToAuthChanges(callback) {
  const client = requireSupabase();
  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => data.subscription.unsubscribe();
}
