import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase";

export const useGoogleSignin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Verifica o usuário após o login
      const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Verifica se o usuário já existe na tabela public.users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows found
            throw userError;
          }

          // Se não existir, cria o registro
          if (!userData) {
            const { error: upsertError } = await supabase
              .from('users')
              .upsert({
                id: user.id, // OBRIGATÓRIO
                email: user.email,
                name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
                avatar_url: user.user_metadata?.avatar_url || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                role: 'client' // Definindo um valor padrão
              });

            if (upsertError) {
              throw upsertError;
            }
          }

          navigate('/');
          return true;
        }
        return false;
      };

      // Tenta verificar o usuário algumas vezes com timeout
      let attempts = 0;
      const maxAttempts = 10;
      const interval = 500;

      const checkInterval = setInterval(async () => {
        attempts++;
        const success = await checkUser();
        
        if (success || attempts >= maxAttempts) {
          clearInterval(checkInterval);
          if (attempts >= maxAttempts) {
            throw new Error('Tempo limite excedido ao aguardar autenticação');
          }
        }
      }, interval);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erro ao fazer login com Google. Tente novamente.";
        
        console.log(`errorMessage ::`, errorMessage)
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    loading,
  };
};
