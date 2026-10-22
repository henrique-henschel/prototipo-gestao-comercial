import { useRef, useState } from 'react';
import { KeyRound, LogIn, Mail, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { CenteredLayout } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { useSession } from '@/hooks/useSession.js';
import { useToast } from '@/hooks/useToast.js';
import { AuthCard, OrDivider } from '../components/AuthCard.jsx';
import styles from './AuthPages.module.css';

/**
 * Entrar (simulado): qualquer e-mail e senha funcionam, e há a conta de demonstração.
 * Depois de entrar, a guarda `PublicOnly` leva para a tela pedida ou para as boas-vindas.
 */
export default function LoginPage() {
  const { login, loginDemo } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(/** @type {'form'|'demo'|null} */ (null));
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  async function run(kind, action) {
    setPending(kind);
    try {
      await action();
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
      setPending(null);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!email.trim()) next.email = 'Digite seu e-mail.';
    if (!password) next.password = 'Digite sua senha.';
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    run('form', () => login({ email, password }));
  }

  return (
    <CenteredLayout showTagline>
      <AuthCard
        title="Entrar"
        description="Use o seu e-mail e a sua senha."
        footer={
          <p>
            Ainda não tem conta? <Link to={ROUTES.signup}>Criar conta grátis</Link>
          </p>
        }
      >
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            ref={emailRef}
            label="E-mail"
            type="email"
            icon={Mail}
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
          <Input
            ref={passwordRef}
            label="Senha"
            type="password"
            icon={KeyRound}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <Button
            type="submit"
            size="lg"
            icon={LogIn}
            fullWidth
            loading={pending === 'form'}
            disabled={pending !== null}
          >
            Entrar
          </Button>
        </form>

        <OrDivider />

        <div className={styles.demo}>
          <Button
            variant="secondary"
            size="lg"
            icon={Sparkles}
            fullWidth
            loading={pending === 'demo'}
            disabled={pending !== null}
            onClick={() => run('demo', loginDemo)}
          >
            Entrar com conta de demonstração
          </Button>
          <p className={styles.hint}>
            Para conhecer o app com vendas, clientes e produtos de exemplo. É um protótipo: qualquer e-mail e
            senha entram, e nada fica salvo.
          </p>
        </div>
      </AuthCard>
    </CenteredLayout>
  );
}
