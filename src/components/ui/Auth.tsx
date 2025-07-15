"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./avatar";

export default function Auth() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pega a sessão atual
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Erro ao buscar sessão:", error);
        return;
      }
      setSession(session);
      setLoading(false);
    });

    // Observa mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Erro no login:", error.message);
      // Você pode mostrar um toast/alert para o usuário aqui
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro no logout:", error.message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="flex items-center gap-4">
      {session ? (
        <>
          <Avatar />
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sair
          </button>
        </>
      ) : (
        <button
          onClick={handleLogin}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Entrar com Google
        </button>
      )}
    </div>
  );
}
