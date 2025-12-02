"""Add seed data

Revision ID: 5ff39abf69de
Revises: f6f2c4ab30e4
Create Date: 2025-11-29 12:00:01.245810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime


# revision identifiers, used by Alembic.
revision: str = '5ff39abf69de'
down_revision: Union[str, None] = 'f6f2c4ab30e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    
    now = datetime.utcnow()
    
    # Insert users using raw SQL
    session.execute(
        text("""
            INSERT INTO users (name, email, phone, created_at, updated_at)
            VALUES 
                (:name1, :email1, :phone1, :now, :now),
                (:name2, :email2, :phone2, :now, :now),
                (:name3, :email3, :phone3, :now, :now)
        """),
        {
            "name1": "Alice Dubois", "email1": "alice@example.com", "phone1": "+33612345678",
            "name2": "Bob Martin", "email2": "bob@example.com", "phone2": "+33698765432",
            "name3": "Claire Lefebvre", "email3": "claire@example.com", "phone3": "+33687654321",
            "now": now
        }
    )
    
    # Insert interviews with proper ENUM casting - USE UPPERCASE
    session.execute(
        text("""
            INSERT INTO interviews (interviewer_style, question_count, user_id, job_description, global_feedback, created_at, updated_at)
            VALUES 
                ('NICE'::interviewerstyle, 5, 1, :job1, :feedback1, :now, :now),
                ('NEUTRAL'::interviewerstyle, 5, 1, :job2, :feedback2, :now, :now),
                ('MEAN'::interviewerstyle, 5, 2, :job3, :feedback3, :now, :now),
                ('NICE'::interviewerstyle, 5, 3, :job4, :feedback4, :now, :now)
        """),
        {
            "job1": "Développeur Full-Stack React/Node.js",
            "feedback1": "Excellent entretien ! Le candidat a démontré de solides compétences techniques et une bonne capacité de communication.",
            "job2": "Data Scientist Junior",
            "feedback2": "Performance satisfaisante. Quelques points à améliorer sur les aspects statistiques.",
            "job3": "Chef de Projet IT",
            "feedback3": "Des lacunes importantes identifiées. Le candidat manque d'expérience en gestion de projets complexes.",
            "job4": "Designer UX/UI",
            "feedback4": "Très bon portfolio et excellente approche centrée utilisateur.",
            "now": now
        }
    )
    
    # Interview 1: Full-Stack Developer (Alice - Nice interviewer)
    session.execute(
        text("""
            INSERT INTO question_answers (question, answer, feedback, grade, interview_id)
            VALUES 
                (:q1, :a1, :f1, :g1, 1),
                (:q2, :a2, :f2, :g2, 1),
                (:q3, :a3, :f3, :g3, 1),
                (:q4, :a4, :f4, :g4, 1),
                (:q5, :a5, :f5, :g5, 1)
        """),
        {
            "q1": "Parlez-moi de vous et de votre parcours en développement web.",
            "a1": "Je suis développeuse full-stack avec 3 ans d'expérience. J'ai commencé par du front-end avec React, puis j'ai évolué vers le back-end avec Node.js et Python. J'ai travaillé sur plusieurs projets e-commerce et SaaS.",
            "f1": "Excellente introduction, bien structurée et concise. Le parcours est clair et cohérent.",
            "g1": 9,
            
            "q2": "Pouvez-vous m'expliquer la différence entre useState et useReducer en React ?",
            "a2": "useState est parfait pour gérer un état simple, tandis que useReducer est préférable pour un état complexe avec plusieurs sous-valeurs ou quand la logique de mise à jour est complexe. useReducer suit le pattern Redux avec des actions et un reducer.",
            "f2": "Réponse technique très solide. Bonne compréhension des hooks React et de leurs cas d'usage.",
            "g2": 9,
            
            "q3": "Comment gérez-vous l'authentification dans vos applications ?",
            "a3": "J'utilise généralement JWT pour l'authentification. Le token est stocké dans httpOnly cookies pour la sécurité. Côté back-end, je valide le token à chaque requête avec un middleware. J'implémente aussi le refresh token pour prolonger les sessions.",
            "f3": "Excellente réponse qui montre une bonne compréhension de la sécurité. Mention des bonnes pratiques comme httpOnly cookies.",
            "g3": 10,
            
            "q4": "Décrivez-moi un projet dont vous êtes particulièrement fière.",
            "a4": "J'ai développé une plateforme de réservation en temps réel pour un réseau de salles de sport. Le défi était de gérer la concurrence sur les réservations. J'ai utilisé WebSockets pour les mises à jour en temps réel et implémenté un système de verrouillage optimiste en base de données.",
            "f4": "Excellent exemple qui démontre la capacité à résoudre des problèmes complexes. Bonne connaissance des systèmes temps réel.",
            "g4": 9,
            
            "q5": "Quelles sont vos attentes pour ce poste ?",
            "a5": "Je recherche un environnement où je peux continuer à apprendre, notamment sur l'architecture microservices et le cloud. J'aimerais aussi avoir l'opportunité de mentorer des développeurs juniors et contribuer aux décisions techniques.",
            "f5": "Réponse mature qui montre de l'ambition et l'envie de progresser. Bon alignement avec la culture d'entreprise.",
            "g5": 8
        }
    )
    
    # Interview 2: Data Scientist (Alice - Neutral interviewer)
    session.execute(
        text("""
            INSERT INTO question_answers (question, answer, feedback, grade, interview_id)
            VALUES 
                (:q1, :a1, :f1, :g1, 2),
                (:q2, :a2, :f2, :g2, 2),
                (:q3, :a3, :f3, :g3, 2),
                (:q4, :a4, :f4, :g4, 2),
                (:q5, :a5, :f5, :g5, 2)
        """),
        {
            "q1": "Expliquez-moi votre expérience en machine learning.",
            "a1": "J'ai travaillé sur des projets de classification et de régression. J'utilise principalement scikit-learn et parfois TensorFlow. J'ai fait un projet de prédiction de churn clients avec un random forest qui a atteint 85% de précision.",
            "f1": "Réponse correcte mais manque de profondeur sur les aspects théoriques. Aurait pu mentionner les métriques de validation croisée.",
            "g1": 6,
            
            "q2": "Comment choisissez-vous entre différents algorithmes de ML ?",
            "a2": "Ça dépend du problème. Pour la classification, j'essaie plusieurs algorithmes et je compare leurs performances. Je regarde aussi la taille du dataset et si j'ai besoin d'interprétabilité.",
            "f2": "Réponse trop générique. Manque de méthodologie structurée et de connaissance des compromis biais-variance.",
            "g2": 5,
            
            "q3": "Qu'est-ce que l'overfitting et comment le prévenir ?",
            "a3": "L'overfitting c'est quand le modèle apprend trop bien les données d'entraînement et ne généralise pas. Pour le prévenir, on utilise la validation croisée, la régularisation, et on peut réduire la complexité du modèle.",
            "f3": "Bonne compréhension du concept et des solutions principales. Réponse satisfaisante.",
            "g3": 7,
            
            "q4": "Avez-vous de l'expérience avec le deep learning ?",
            "a4": "J'ai suivi des cours en ligne et fait quelques tutoriels avec TensorFlow. J'ai créé un modèle CNN pour classifier des images de chiens et chats qui marchait plutôt bien.",
            "f4": "Expérience limitée, principalement académique. Pas d'expérience en production avec le deep learning.",
            "g4": 5,
            
            "q5": "Comment présentez-vous vos résultats aux parties prenantes non-techniques ?",
            "a5": "J'utilise beaucoup de visualisations avec matplotlib et seaborn. J'essaie d'expliquer les résultats simplement sans trop de jargon technique. Je fais aussi des présentations PowerPoint avec les insights clés.",
            "f5": "Approche correcte mais pourrait être plus détaillée sur l'adaptation du discours aux différents publics.",
            "g5": 6
        }
    )
    
    # Interview 3: Chef de Projet IT (Bob - Mean interviewer)
    session.execute(
        text("""
            INSERT INTO question_answers (question, answer, feedback, grade, interview_id)
            VALUES 
                (:q1, :a1, :f1, :g1, 3),
                (:q2, :a2, :f2, :g2, 3),
                (:q3, :a3, :f3, :g3, 3),
                (:q4, :a4, :f4, :g4, 3),
                (:q5, :a5, :f5, :g5, 3)
        """),
        {
            "q1": "Combien de projets IT avez-vous gérés de bout en bout ?",
            "a1": "J'ai participé à plusieurs projets en tant que membre d'équipe, et j'ai coordonné un petit projet de migration de serveurs l'année dernière.",
            "f1": "Expérience clairement insuffisante pour un poste de chef de projet. Pas de gestion de projet d'envergure.",
            "g1": 3,
            
            "q2": "Comment gérez-vous un projet en retard avec un budget dépassé ?",
            "a2": "Euh, je pense qu'il faut d'abord identifier pourquoi on est en retard. Ensuite, peut-être renégocier les délais avec le client ou demander plus de ressources.",
            "f2": "Réponse vague et peu convaincante. Manque de méthodologie et d'expérience concrète dans la gestion de crise.",
            "g2": 2,
            
            "q3": "Quels outils de gestion de projet maîtrisez-vous ?",
            "a3": "J'ai utilisé Trello et un peu Jira. Je connais aussi Excel pour suivre les budgets.",
            "f3": "Connaissance très basique des outils. Pour un chef de projet, c'est insuffisant. Pas de mention de MS Project, Gantt, ou outils avancés.",
            "g3": 3,
            
            "q4": "Décrivez-moi un conflit d'équipe que vous avez résolu.",
            "a4": "Il y a eu une fois deux développeurs qui n'étaient pas d'accord sur l'approche technique. J'ai organisé une réunion pour qu'ils discutent et ils ont trouvé un compromis.",
            "f4": "Exemple trop simple et rôle passif. Un chef de projet doit montrer du leadership et une capacité de médiation plus forte.",
            "g4": 4,
            
            "q5": "Pourquoi voulez-vous ce poste de chef de projet ?",
            "a5": "Je pense que c'est une évolution naturelle dans ma carrière. J'aime coordonner les personnes et j'aimerais avoir plus de responsabilités.",
            "f5": "Motivation peu convaincante. Manque de compréhension réelle des défis du poste et de vision stratégique.",
            "g5": 3
        }
    )
    
    # Interview 4: Designer UX/UI (Claire - Nice interviewer)
    session.execute(
        text("""
            INSERT INTO question_answers (question, answer, feedback, grade, interview_id)
            VALUES 
                (:q1, :a1, :f1, :g1, 4),
                (:q2, :a2, :f2, :g2, 4),
                (:q3, :a3, :f3, :g3, 4),
                (:q4, :a4, :f4, :g4, 4),
                (:q5, :a5, :f5, :g5, 4)
        """),
        {
            "q1": "Parlez-moi de votre approche du design centré utilisateur.",
            "a1": "Je commence toujours par comprendre les utilisateurs à travers des interviews et des persona. Ensuite, je crée des wireframes et des prototypes que je teste avec de vrais utilisateurs. J'itère en fonction des retours avant de finaliser les maquettes haute-fidélité.",
            "f1": "Excellente méthodologie ! Processus bien structuré qui montre une vraie compréhension du design thinking.",
            "g1": 10,
            
            "q2": "Comment gérez-vous les retours contradictoires des parties prenantes ?",
            "a2": "Je ramène toujours la discussion aux objectifs utilisateurs et business. Je présente des données d'usage ou des tests utilisateurs pour appuyer mes choix. Si besoin, j'organise des ateliers collaboratifs pour aligner tout le monde.",
            "f2": "Très bonne approche diplomatique basée sur les données. Montre de la maturité professionnelle.",
            "g2": 9,
            
            "q3": "Quel est votre outil de design préféré et pourquoi ?",
            "a3": "J'utilise principalement Figma pour sa collaboration en temps réel. Les composants réutilisables et les variables de design permettent de maintenir la cohérence. J'apprécie aussi l'intégration avec les outils de développement comme Zeplin.",
            "f3": "Excellente maîtrise des outils modernes. Bonne compréhension de l'importance du design system.",
            "g3": 9,
            
            "q4": "Montrez-moi un projet de votre portfolio dont vous êtes particulièrement fière.",
            "a4": "J'ai redesigné l'application mobile d'une banque. Le taux de completion des virements est passé de 60% à 92% après le redesign. J'ai simplifié le parcours de 7 à 3 étapes et ajouté des confirmations visuelles claires. Les retours utilisateurs sont passés de 3.2 à 4.6 étoiles.",
            "f4": "Présentation exceptionnelle avec des métriques concrètes d'impact. Démontre la valeur business du design.",
            "g4": 10,
            
            "q5": "Comment vous tenez-vous à jour sur les tendances UX/UI ?",
            "a5": "Je suis plusieurs newsletters comme Nielsen Norman Group et Smashing Magazine. Je participe à des meetups UX locaux et je suis des cours sur Interaction Design Foundation. J'analyse aussi régulièrement les patterns des apps leaders comme Airbnb ou Stripe.",
            "f5": "Très bon engagement dans l'apprentissage continu. Sources de qualité et approche proactive.",
            "g5": 9
        }
    )
    
    session.commit()


def downgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    
    # Delete in reverse order (foreign keys)
    session.execute(text("DELETE FROM question_answers"))
    session.execute(text("DELETE FROM interviews"))
    session.execute(text("DELETE FROM users"))
    
    session.commit()