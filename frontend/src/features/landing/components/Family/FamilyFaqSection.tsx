import { Plus } from 'lucide-react';
import styles from '../../LandingPage.module.css';

const questions = [
  {
    title: '¿Qué es Kids4Safe?',
    answer:
      'Es una app de control parental y protección familiar centrada en el acompañamiento: ubicación compartida con permiso, una señal de Auxilio y un perfil con información útil en una emergencia.',
  },
  {
    title: '¿Cómo se activa Auxilio?',
    answer:
      'Desde la pantalla de Inicio, mantén presionado el botón durante tres segundos. Esa pulsación ayuda a evitar activaciones accidentales. La señal requiere conexión con el servicio.',
  },
  {
    title: '¿Tengo que dar todos los permisos?',
    answer:
      'Puedes revisar y personalizar los accesos desde Seguridad. Cada función necesita sus permisos correspondientes: por ejemplo, compartir ubicación requiere el acceso a la ubicación del dispositivo.',
  },
  {
    title: '¿Por dónde empiezo?',
    answer:
      'Crea tu cuenta, completa el perfil y el contacto de emergencia, y revisa los permisos en el dispositivo. Dedica un momento a conocer la app con tus hijos antes de necesitarla.',
  },
];

export function FamilyFaqSection() {
  return (
    <section
      id="questions"
      className={`${styles.container} ${styles.section} ${styles.faqSection}`}
      aria-labelledby="questions-heading"
    >
      <div className={styles.sectionHeading}>
        <span className={styles.eyebrow}>Resolvemos tus dudas</span>
        <h2 id="questions-heading">Antes de empezar, lo que quieres saber.</h2>
      </div>
      <div className={styles.faq}>
        {questions.map(({ title, answer }) => (
          <details key={title} name="kids4safe-faq">
            <summary>
              {title}
              <Plus size={18} aria-hidden="true" />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
