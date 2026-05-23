import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité — OpMind",
  description:
    "Politique de confidentialité et de traitement des données personnelles d'OpMind, conforme au RGPD.",
};

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      tag="RGPD"
      title="Politique de confidentialité"
      updatedAt="18 mai 2026"
    >
      <LegalSection title="Préambule">
        <p>
          OpMind est une application d&apos;entraînement au tir sportif
          éditée par <strong>Hamid Bride</strong>, auto-entrepreneur en
          France. La présente politique décrit comment sont collectées,
          utilisées, conservées et protégées les données personnelles des
          utilisateurs du site <strong>opmind.fr</strong> et de
          l&apos;application mobile OpMind.
        </p>
        <p>
          Ce document est conforme au{" "}
          <strong>
            Règlement (UE) 2016/679 du Parlement européen et du Conseil
          </strong>{" "}
          du 27 avril 2016 (Règlement Général sur la Protection des Données —
          RGPD) et à la loi française n°78-17 du 6 janvier 1978 dite
          &laquo; Informatique et Libertés &raquo; modifiée.
        </p>
      </LegalSection>

      <LegalSection title="Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles est{" "}
          <strong>Hamid Bride</strong>, auto-entrepreneur, joignable à
          l&apos;adresse{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>.
        </p>
        <p>
          OpMind n&apos;est pas tenue de désigner un Délégué à la Protection
          des Données (DPO) compte tenu de sa taille et de la nature des
          traitements, mais reste à la disposition des utilisateurs pour
          toute demande relative à leurs données.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <h3>À l&apos;inscription</h3>
        <ul>
          <li>Adresse email</li>
          <li>
            Mot de passe (stocké de manière chiffrée et irréversible —
            jamais en clair)
          </li>
          <li>Nom ou pseudonyme choisi par l&apos;utilisateur</li>
        </ul>

        <h3>Pendant l&apos;utilisation de l&apos;application</h3>
        <ul>
          <li>
            Données d&apos;entraînement : séances réalisées, temps,
            chronométrages (splits), zones d&apos;impact, scores calculés
            (Hit Factor, accuracy)
          </li>
          <li>
            Photos optionnelles attachées aux séances (stockées
            chiffrées)
          </li>
          <li>
            Profil tireur : discipline pratiquée, division, arsenal déclaré
          </li>
          <li>
            Données issues du shot timer (BLE matériel ou détection audio
            via micro)
          </li>
          <li>Données issues du module Performance (sommeil, stress, fatigue, motivation) — saisies volontairement</li>
        </ul>

        <h3>Données techniques</h3>
        <ul>
          <li>
            Adresse IP (conservée dans les logs serveur pour une durée
            maximale de 12 mois)
          </li>
          <li>Type d&apos;appareil, version du système d&apos;exploitation, version de l&apos;application</li>
          <li>Cookies techniques d&apos;authentification (Supabase)</li>
        </ul>

        <h3>Inscription à la liste d&apos;attente</h3>
        <ul>
          <li>Adresse email uniquement, fournie volontairement</li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalités et bases légales">
        <p>
          Les données collectées sont traitées pour les finalités suivantes,
          chacune reposant sur une base légale précise :
        </p>
        <ul>
          <li>
            <strong>Fourniture du service</strong> (création de compte,
            synchronisation des données, historique d&apos;entraînement) —{" "}
            <em>exécution du contrat</em> (article 6.1.b RGPD)
          </li>
          <li>
            <strong>Analyse de performance personnelle</strong> et
            statistiques individuelles — <em>exécution du contrat</em>
          </li>
          <li>
            <strong>Sécurité du compte</strong> et prévention de la fraude —{" "}
            <em>intérêt légitime</em> (article 6.1.f)
          </li>
          <li>
            <strong>Communication relative à la bêta</strong> et
            informations produit pour la waitlist —{" "}
            <em>consentement</em> (article 6.1.a), révocable à tout moment
          </li>
          <li>
            <strong>Amélioration du service</strong> via analyse agrégée et
            anonymisée — <em>intérêt légitime</em>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul>
          <li>
            <strong>Compte actif</strong> : pendant toute la durée
            d&apos;utilisation du service
          </li>
          <li>
            <strong>Compte supprimé</strong> : suppression complète et
            définitive sous 30 jours
          </li>
          <li>
            <strong>Logs techniques et de sécurité</strong> : 12 mois maximum
          </li>
          <li>
            <strong>Inscription waitlist</strong> : jusqu&apos;à la sortie
            de la version 1.0 ou désinscription par l&apos;utilisateur
          </li>
          <li>
            <strong>Sauvegardes</strong> : 30 jours après suppression du
            compte principal
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <p>
          Les données personnelles sont accessibles uniquement à Hamid Bride
          (éditeur d&apos;OpMind) et au sous-traitant technique suivant,
          encadré par un accord de traitement conforme à l&apos;article 28
          du RGPD :
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> — hébergement de la base de
            données et de l&apos;authentification. Serveurs situés dans
            l&apos;Union européenne.{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Politique de confidentialité Supabase
            </a>
            .
          </li>
          <li>
            <strong>GitHub Inc.</strong> — hébergement du site
            <strong> opmind.fr</strong> via GitHub Pages (site statique, sans
            collecte de données utilisateur côté serveur).
          </li>
        </ul>
        <p>
          <strong>
            Aucune donnée n&apos;est revendue, partagée à des annonceurs,
            ni utilisée à des fins publicitaires.
          </strong>{" "}
          OpMind ne contient aucun tracker publicitaire ni outil
          d&apos;analyse tiers (pas de Google Analytics, pas de Facebook
          Pixel, etc.).
        </p>
      </LegalSection>

      <LegalSection title="Transferts hors UE">
        <p>
          Les données utilisateurs sont stockées exclusivement sur des
          serveurs situés dans l&apos;Union européenne. Aucun transfert de
          données hors UE n&apos;est effectué dans le cadre du
          fonctionnement nominal du service.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site et l&apos;application utilisent uniquement des{" "}
          <strong>cookies strictement nécessaires</strong> au fonctionnement
          du service, en particulier les cookies de session
          d&apos;authentification gérés par Supabase. Ces cookies sont
          exemptés du consentement préalable selon la délibération de la
          CNIL n°2020-091 du 17 septembre 2020.
        </p>
        <p>
          Aucun cookie publicitaire, aucun cookie tiers de mesure
          d&apos;audience, aucun pixel de traçage n&apos;est déposé.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément aux articles 15 à 22 du RGPD, vous disposez à tout
          moment des droits suivants sur vos données personnelles :
        </p>
        <ul>
          <li>
            <strong>Droit d&apos;accès</strong> — obtenir confirmation et
            copie de vos données
          </li>
          <li>
            <strong>Droit de rectification</strong> — corriger des
            informations inexactes
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> — suppression complète
            de votre compte et de vos données (&laquo; droit à
            l&apos;oubli &raquo;)
          </li>
          <li>
            <strong>Droit à la portabilité</strong> — récupération de vos
            données dans un format structuré et lisible (export JSON)
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> au traitement
          </li>
          <li>
            <strong>Droit à la limitation</strong> du traitement
          </li>
          <li>
            <strong>Droit de retirer votre consentement</strong> à tout moment
            (waitlist, communications)
          </li>
          <li>
            <strong>Droit de définir des directives</strong> relatives au
            sort de vos données après votre décès
          </li>
        </ul>
        <p>
          Pour exercer ces droits, écrivez à{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a> en précisant
          la nature de votre demande. Une preuve d&apos;identité pourra
          être demandée en cas de doute légitime. La demande sera traitée
          dans un délai maximum d&apos;<strong>un mois</strong>, prolongeable
          de deux mois en cas de complexité particulière.
        </p>
        <p>
          Si vous estimez, après nous avoir contactés, que vos droits ne sont
          pas respectés, vous pouvez adresser une réclamation à la{" "}
          <strong>
            CNIL (Commission Nationale de l&apos;Informatique et des
            Libertés)
          </strong>{" "}
          :{" "}
          <a
            href="https://www.cnil.fr/fr/plaintes"
            target="_blank"
            rel="noopener noreferrer"
          >
            cnil.fr/fr/plaintes
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les mesures techniques et organisationnelles suivantes sont mises
          en œuvre pour protéger vos données :
        </p>
        <ul>
          <li>
            Chiffrement en transit via TLS 1.3 pour toutes les communications
            entre l&apos;application et les serveurs
          </li>
          <li>
            Mots de passe stockés de manière hachée (algorithme bcrypt), non
            réversible
          </li>
          <li>
            Politique <strong>Row Level Security</strong> (RLS) sur la base
            de données : chaque utilisateur ne peut accéder qu&apos;à ses
            propres données
          </li>
          <li>Sauvegardes chiffrées et géo-redondantes au sein de l&apos;UE</li>
          <li>Accès aux systèmes de production strictement limité</li>
        </ul>
        <p>
          Malgré ces mesures, aucun système n&apos;est inviolable. En cas de
          violation de données susceptible d&apos;engendrer un risque élevé
          pour vos droits et libertés, vous serez informé dans les meilleurs
          délais conformément à l&apos;article 34 du RGPD.
        </p>
      </LegalSection>

      <LegalSection title="Mineurs">
        <p>
          OpMind est destinée à un public majeur (18 ans révolus) en raison
          de la nature de l&apos;activité (tir sportif). La création de
          compte par des mineurs est interdite. Si vous découvrez qu&apos;un
          mineur s&apos;est inscrit, contactez{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a> pour
          suppression immédiate.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          La présente politique peut être amenée à évoluer. Toute
          modification substantielle sera notifiée par email aux utilisateurs
          inscrits au moins 15 jours avant son entrée en vigueur. La version
          en vigueur est celle publiée sur cette page, datée en tête du
          document.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
