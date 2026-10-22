import { useRef, useState } from 'react';
import { KeyRound, Mail, UserPlus, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { ROUTES } from '@/app/routes.js';
import { CenteredLayout } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { useSession } from '@/hooks/useSession.js';
import { useToast } from '@/hooks/useToast.js';
import { AuthCard } from '../components/AuthCard.jsx';
import styles from './AuthPages.module.css';

/** Criar conta (simulado). Depois vêm as boas-vindas, que configuram o negócio. */
export default function SignupPage() {
  const { signup } = useSession();
  const toast = useToast();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!values.name.trim()) next.name = 'Digite o seu nome.';
    if (!values.email.trim()) next.email = 'Digite o seu e-mail.';
    if (!values.password) next.password = 'Crie uma senha.';
    setErrors(next);
    const firstInvalid = { name: nameRef, email: emailRef, password: passwordRef }[Object.keys(next)[0]];
    if (firstInvalid) {
      firstInvalid.current?.focus();
      return;
    }
    setPending(true);
    try {
      await signup(values);
    } catch (error) {
      toast.show({ message: error.message, tone: 'danger' });
      setPending(false);
    }
  }

  return (
    <CenteredLayout showTagline>
      <AuthCard
        title="Criar conta"
        description="É rápido: depois você conta um pouco sobre o seu negócio."
        footer={
          <p>
            Já tem conta? <Link to={ROUTES.login}>Entrar</Link>
          </p>
        }
      >
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            ref={nameRef}
            label="Seu nome"
            icon={UserRound}
            autoComplete="name"
            value={values.name}
            onChange={change('name')}
            error={errors.name}
          />
          <Input
            ref={emailRef}
            label="E-mail"
            type="email"
            icon={Mail}
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={change('email')}
            error={errors.email}
          />
          <Input
            ref={passwordRef}
            label="Senha"
            type="password"
            icon={KeyRound}
            autoComplete="new-password"
            value={values.password}
            onChange={change('password')}
            error={errors.password}
          />
          <Button type="submit" size="lg" icon={UserPlus} fullWidth loading={pending}>
            Criar conta
          </Button>
        </form>
      </AuthCard>
    </CenteredLayout>
  );
}
