import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Mentions légales — OpMind",
  description:
    "Informations légales concernant l'éditeur du site et de l'application OpMind.",
};

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      tag="Informations légales"
      title="Mentions légales"
      updatedAt="18 mai 2026"
    >
      <LegalSection title="Éditeur">
        <p>
          Le site <strong>opmind.fr</strong> et l&apos;application mobile OpMind
          sont édités par :
        </p>
        <ul>
          <li>
            <strong>Nom</strong> : Hamid Bride
          </li>
          <li>
            <strong>Statut juridique</strong> : Auto-entrepreneur (France)
          </li>
          <li>
            <strong>Email de contact</strong> :{" "}
            <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>
          </li>
          <li>
            <strong>Directeur de la publication</strong> : Hamid Bride
          </li>
        </ul>
        <p>
          Le numéro SIRET et l&apos;adresse de domiciliation sont communiqués
          sur demande à{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>,
          conformément à la réglementation applicable aux travailleurs
          indépendants.
        </p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <h3>Site web</h3>
        <p>
          Le site <strong>opmind.fr</strong> est hébergé par{" "}
          <strong>GitHub Pages</strong>, exploité par GitHub, Inc., 88 Colin P
          Kelly Jr Street, San Francisco, CA 94107, États-Unis.
        </p>
        <h3>Base de données et services backend</h3>
        <p>
          Les données utilisateurs de l&apos;application OpMind sont stockées
          et traitées par <strong>Supabase</strong> (Supabase, Inc.), sur des
          serveurs situés exclusivement dans l&apos;
          <strong>Union européenne</strong>. Voir la{" "}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            politique de confidentialité de Supabase
          </a>{" "}
          pour plus de détails.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments composant le site et l&apos;application
          OpMind (textes, illustrations, photographies, logos, design,
          architecture, code source, marques) est protégé par les lois
          françaises et internationales relatives à la propriété
          intellectuelle. Ces éléments sont la propriété exclusive de Hamid
          Bride.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication,
          adaptation ou exploitation, totale ou partielle, par quelque procédé
          que ce soit et sur quelque support que ce soit, sans
          l&apos;autorisation écrite préalable de l&apos;éditeur, est
          interdite et constitue une contrefaçon sanctionnée par les articles
          L.335-2 et suivants du Code de la propriété intellectuelle.
        </p>
      </LegalSection>

      <LegalSection title="Marque OpMind">
        <p>
          La marque <strong>OpMind</strong> et le logo associé sont la
          propriété de Hamid Bride. Toute utilisation non autorisée à des
          fins commerciales ou de communication est strictement prohibée et
          fera l&apos;objet de poursuites.
        </p>
      </LegalSection>

      <LegalSection title="Crédits">
        <p>
          <strong>Polices de caractères</strong> : Barlow, Barlow Condensed
          et Rajdhani, distribuées via Google Fonts sous licence SIL Open
          Font.
        </p>
        <p>
          <strong>Photographies</strong> : photographies originales et
          ressources libres de droits sous licences appropriées.
        </p>
        <p>
          <strong>Technologies</strong> : Next.js (Vercel, licence MIT), React
          (Meta, licence MIT), Tailwind CSS (Tailwind Labs, licence MIT),
          Framer Motion (Framer, licence MIT), Supabase (licence Apache 2.0).
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement des données personnelles fait l&apos;objet d&apos;une{" "}
          <a href="/confidentialite">Politique de confidentialité</a>{" "}
          dédiée, conforme au Règlement Général sur la Protection des Données
          (RGPD).
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative au site, à l&apos;application ou aux
          présentes mentions légales :{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
