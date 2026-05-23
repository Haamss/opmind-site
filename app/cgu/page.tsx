import type { Metadata } from "next";
import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — OpMind",
  description:
    "Conditions générales d'utilisation de l'application OpMind et du site opmind.fr.",
};

export default function CGUPage() {
  return (
    <LegalLayout
      tag="CGU"
      title="Conditions générales d'utilisation"
      updatedAt="18 mai 2026"
    >
      <LegalSection title="Article 1 — Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après{" "}
          <strong>&laquo; CGU &raquo;</strong>) régissent l&apos;usage du
          site <strong>opmind.fr</strong> et de l&apos;application mobile
          OpMind (ci-après le <strong>&laquo; Service &raquo;</strong>),
          édités par Hamid Bride, auto-entrepreneur en France.
        </p>
        <p>
          OpMind est un outil logiciel d&apos;entraînement au tir sportif
          permettant de structurer des séances, de chronométrer des tirs,
          d&apos;analyser des performances et d&apos;archiver un historique
          d&apos;entraînement.
        </p>
      </LegalSection>

      <LegalSection title="Article 2 — Acceptation des CGU">
        <p>
          La création d&apos;un compte et l&apos;utilisation du Service
          impliquent l&apos;acceptation pleine, entière et sans réserve des
          présentes CGU. Si vous n&apos;acceptez pas ces conditions,
          n&apos;utilisez pas le Service et n&apos;ouvrez pas de compte.
        </p>
      </LegalSection>

      <LegalSection title="Article 3 — Conditions d'accès et inscription">
        <ul>
          <li>
            L&apos;utilisateur doit être <strong>majeur</strong> (18 ans
            révolus) au moment de l&apos;inscription
          </li>
          <li>
            L&apos;utilisateur doit être <strong>en règle</strong> avec la
            législation locale en matière de détention et d&apos;usage
            d&apos;armes à feu et de pratique du tir sportif
          </li>
          <li>
            Les informations fournies à l&apos;inscription doivent être
            exactes, complètes et tenues à jour
          </li>
          <li>
            L&apos;utilisateur est seul responsable de la confidentialité de
            son mot de passe et de toute activité réalisée depuis son compte
          </li>
          <li>
            Un seul compte par personne physique est autorisé
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Article 4 — Description du Service">
        <p>OpMind propose, sans que cette liste soit limitative :</p>
        <ul>
          <li>
            Modules d&apos;entraînement structurés (Basique, Standards IPSC,
            Vector — stages 3D, Performance, Carnet de tir personnalisé)
          </li>
          <li>
            Shot timer logiciel (détection audio via micro) ou matériel
            (connexion BLE avec le SG Timer 2)
          </li>
          <li>
            Calcul automatique de scores (Hit Factor, accuracy, splits,
            transitions)
          </li>
          <li>
            Synchronisation cloud chiffrée des données via Supabase (Union
            européenne)
          </li>
          <li>
            Mode hors ligne pour l&apos;ensemble des fonctionnalités
            d&apos;entraînement
          </li>
        </ul>
        <p>
          Le Service est actuellement en <strong>phase bêta</strong>.
          Certaines fonctionnalités peuvent être instables, ajoutées,
          modifiées ou retirées sans préavis pendant cette phase.
        </p>
      </LegalSection>

      <LegalSection title="Article 5 — Sécurité au tir et responsabilité de l'utilisateur">
        <p>
          <strong>
            OpMind est un outil d&apos;entraînement. Il ne se substitue en
            aucun cas aux règles de sécurité applicables au tir sportif ni
            à la formation dispensée par un instructeur qualifié.
          </strong>
        </p>
        <ul>
          <li>
            L&apos;utilisateur reste <strong>seul responsable</strong> de sa
            sécurité, de celle des tiers et du respect des règlements du
            stand, club, fédération ou autorité compétente
          </li>
          <li>
            L&apos;utilisateur doit appliquer en toutes circonstances les
            règles fondamentales de sécurité (arme considérée chargée,
            doigt hors de la détente, identification de la cible et de
            l&apos;arrière-plan, contrôle permanent de la direction du
            canon)
          </li>
          <li>
            L&apos;éditeur ne pourra en aucun cas être tenu responsable
            d&apos;un incident, accident, blessure ou dommage matériel
            survenu lors d&apos;une séance de tir, que l&apos;application
            ait été utilisée ou non
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Article 6 — Usage acceptable">
        <p>L&apos;utilisateur s&apos;engage à ne pas :</p>
        <ul>
          <li>
            Utiliser le Service à des fins illégales, frauduleuses ou
            contraires aux bonnes mœurs
          </li>
          <li>Partager son compte, ses identifiants ou son accès avec un tiers</li>
          <li>
            Créer plusieurs comptes ou usurper l&apos;identité d&apos;une
            autre personne
          </li>
          <li>
            Tenter de contourner les mesures de sécurité ou d&apos;accéder
            à des données autres que les siennes
          </li>
          <li>
            Pratiquer l&apos;ingénierie inverse, décompiler, désassembler ou
            extraire le code source de l&apos;application
          </li>
          <li>
            Utiliser des outils automatisés (bots, scripts, scrapers) pour
            interagir avec le Service
          </li>
          <li>
            Surcharger, perturber ou tenter de mettre hors service
            l&apos;infrastructure du Service
          </li>
          <li>
            Publier ou stocker via OpMind des contenus illicites, haineux,
            diffamatoires ou portant atteinte aux droits de tiers
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Article 7 — Disponibilité du Service">
        <p>
          L&apos;éditeur s&apos;efforce de maintenir le Service accessible
          24h/24, 7j/7. Le Service peut néanmoins être interrompu pour des
          opérations de maintenance, mise à jour, cas de force majeure ou
          défaillance d&apos;un sous-traitant technique (notamment
          Supabase).
        </p>
        <p>
          Pendant la phase bêta, <strong>aucun engagement de niveau de
          service (SLA)</strong> n&apos;est garanti. L&apos;application est
          néanmoins conçue pour fonctionner <strong>hors ligne</strong> sur
          l&apos;ensemble des fonctionnalités d&apos;entraînement ; seule
          la synchronisation cloud nécessite une connexion internet.
        </p>
      </LegalSection>

      <LegalSection title="Article 8 — Propriété intellectuelle">
        <p>
          L&apos;application OpMind, son code source, son design, ses
          contenus éditoriaux, ses illustrations et la marque OpMind
          demeurent la propriété exclusive de Hamid Bride. Aucune licence
          autre que celle nécessaire à l&apos;usage personnel et non
          commercial du Service n&apos;est concédée à l&apos;utilisateur.
        </p>
        <p>
          Les <strong>données d&apos;entraînement saisies par l&apos;
          utilisateur</strong> (séances, scores, photos, profil) demeurent
          la propriété de l&apos;utilisateur. L&apos;utilisateur peut les
          exporter au format JSON ou les supprimer à tout moment via son
          compte.
        </p>
      </LegalSection>

      <LegalSection title="Article 9 — Données personnelles">
        <p>
          Le traitement des données personnelles est détaillé dans la{" "}
          <a href="/confidentialite">Politique de confidentialité</a>,
          laquelle fait partie intégrante des présentes CGU. En utilisant le
          Service, vous acceptez les modalités de traitement décrites dans
          cette politique.
        </p>
      </LegalSection>

      <LegalSection title="Article 10 — Limitation de responsabilité">
        <p>
          Le Service est fourni <strong>&laquo; en l&apos;état &raquo;</strong>{" "}
          pendant la phase bêta, sans garantie expresse ou implicite de
          fonctionnement parfait, de continuité ou d&apos;adéquation à un
          usage particulier. L&apos;éditeur ne pourra être tenu responsable :
        </p>
        <ul>
          <li>
            Des pertes de données dues à une panne réseau, à un bug logiciel
            ou à une indisponibilité d&apos;un sous-traitant
          </li>
          <li>
            Des décisions prises par l&apos;utilisateur sur la base des
            analyses, statistiques ou recommandations fournies par
            l&apos;application
          </li>
          <li>
            Des incidents, accidents ou dommages survenus lors de séances
            de tir (voir Article 5)
          </li>
          <li>
            De toute utilisation contraire aux présentes CGU ou aux lois en
            vigueur
          </li>
          <li>
            Des dommages indirects ou immatériels (perte de chance,
            préjudice commercial, manque à gagner)
          </li>
        </ul>
        <p>
          L&apos;utilisateur est invité à effectuer régulièrement des
          sauvegardes (export JSON) de ses données critiques.
        </p>
      </LegalSection>

      <LegalSection title="Article 11 — Suspension et résiliation">
        <p>
          L&apos;utilisateur peut à tout moment supprimer son compte depuis
          l&apos;application ou en écrivant à{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>. La
          suppression entraîne l&apos;effacement définitif des données dans
          un délai maximum de 30 jours.
        </p>
        <p>
          L&apos;éditeur se réserve le droit de suspendre ou de résilier un
          compte en cas de violation grave ou répétée des présentes CGU,
          après notification à l&apos;utilisateur sauf urgence (atteinte à
          la sécurité du Service, fraude, contenu manifestement illicite).
        </p>
      </LegalSection>

      <LegalSection title="Article 12 — Modifications des CGU">
        <p>
          Les présentes CGU peuvent être modifiées à tout moment pour
          refléter les évolutions du Service, de la législation ou des
          conditions d&apos;exploitation. Toute modification substantielle
          sera notifiée aux utilisateurs inscrits par email au moins 15
          jours avant son entrée en vigueur. La poursuite de l&apos;
          utilisation du Service après cette date vaut acceptation des
          nouvelles CGU.
        </p>
      </LegalSection>

      <LegalSection title="Article 13 — Droit applicable et règlement des litiges">
        <p>
          Les présentes CGU sont soumises au <strong>droit français</strong>.
        </p>
        <p>
          En cas de litige, les parties s&apos;efforceront de trouver une
          solution amiable. Conformément aux articles L611-1 et suivants du
          Code de la consommation, l&apos;utilisateur consommateur peut
          recourir gratuitement à un médiateur de la consommation avant tout
          recours judiciaire. Les coordonnées du médiateur seront fournies
          sur demande à{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>.
        </p>
        <p>
          La Commission européenne met également à disposition une
          plateforme de règlement en ligne des litiges accessible à
          l&apos;adresse :{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
        <p>
          À défaut de résolution amiable, les{" "}
          <strong>tribunaux français</strong> seront seuls compétents.
        </p>
      </LegalSection>

      <LegalSection title="Article 14 — Contact">
        <p>
          Pour toute question relative aux présentes CGU :{" "}
          <a href="mailto:contact@opmind.fr">contact@opmind.fr</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
