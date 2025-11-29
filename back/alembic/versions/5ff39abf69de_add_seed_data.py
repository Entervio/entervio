"""Add seed data

Revision ID: 5ff39abf69de
Revises: f6f2c4ab30e4
Create Date: 2025-11-29 12:00:01.245810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from datetime import datetime


# revision identifiers, used by Alembic.
revision: str = '5ff39abf69de'
down_revision: Union[str, None] = 'f6f2c4ab30e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    
    # Define table references
    users_table = sa.table('users',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('email', sa.String),
        sa.column('phone', sa.String),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    
    interviews_table = sa.table('interviews',
        sa.column('id', sa.Integer),
        sa.column('interviewer_style', sa.String),
        sa.column('question_count', sa.Integer),
        sa.column('user_id', sa.Integer),
        sa.column('job_description', sa.Text),
        sa.column('global_feedback', sa.Text),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    
    question_answers_table = sa.table('question_answers',
        sa.column('question', sa.Text),
        sa.column('answer', sa.Text),
        sa.column('feedback', sa.Text),
        sa.column('grade', sa.Integer),
        sa.column('interview_id', sa.Integer)
    )
    
    now = datetime.utcnow()
    
    # Insert users
    session.execute(
        users_table.insert(),
        [
            {"name": "Alice Dubois", "email": "alice@example.com", "phone": "+33612345678", "created_at": now, "updated_at": now},
            {"name": "Bob Martin", "email": "bob@example.com", "phone": "+33698765432", "created_at": now, "updated_at": now},
            {"name": "Claire Lefebvre", "email": "claire@example.com", "phone": "+33687654321", "created_at": now, "updated_at": now},
        ]
    )
    
    # Insert interviews
    session.execute(
        interviews_table.insert(),
        [
            {
                "interviewer_style": "nice", 
                "question_count": 5, 
                "user_id": 1, 
                "job_description": "Développeur Full-Stack React/Node.js",
                "global_feedback": "Excellent entretien ! Le candidat a démontré de solides compétences techniques et une bonne capacité de communication.",
                "created_at": now, 
                "updated_at": now
            },
            {
                "interviewer_style": "neutral", 
                "question_count": 5, 
                "user_id": 1, 
                "job_description": "Data Scientist Junior",
                "global_feedback": "Performance satisfaisante. Quelques points à améliorer sur les aspects statistiques.",
                "created_at": now, 
                "updated_at": now
            },
            {
                "interviewer_style": "mean", 
                "question_count": 5, 
                "user_id": 2, 
                "job_description": "Chef de Projet IT",
                "global_feedback": "Des lacunes importantes identifiées. Le candidat manque d'expérience en gestion de projets complexes.",
                "created_at": now, 
                "updated_at": now
            },
            {
                "interviewer_style": "nice", 
                "question_count": 5, 
                "user_id": 3, 
                "job_description": "Designer UX/UI",
                "global_feedback": "Très bon portfolio et excellente approche centrée utilisateur.",
                "created_at": now, 
                "updated_at": now
            },
        ]
    )
    
    # Interview 1: Full-Stack Developer (Alice - Nice interviewer)
    interview_1_questions = [
        {
            "question": "Parlez-moi de vous et de votre parcours en développement web.",
            "answer": "Je suis développeuse full-stack avec 3 ans d'expérience. J'ai commencé par du front-end avec React, puis j'ai évolué vers le back-end avec Node.js et Python. J'ai travaillé sur plusieurs projets e-commerce et SaaS.",
            "feedback": "Excellente introduction, bien structurée et concise. Le parcours est clair et cohérent.",
            "grade": 9,
            "interview_id": 1
        },
        {
            "question": "Pouvez-vous m'expliquer la différence entre useState et useReducer en React ?",
            "answer": "useState est parfait pour gérer un état simple, tandis que useReducer est préférable pour un état complexe avec plusieurs sous-valeurs ou quand la logique de mise à jour est complexe. useReducer suit le pattern Redux avec des actions et un reducer.",
            "feedback": "Réponse technique très solide. Bonne compréhension des hooks React et de leurs cas d'usage.",
            "grade": 9,
            "interview_id": 1
        },
        {
            "question": "Comment gérez-vous l'authentification dans vos applications ?",
            "answer": "J'utilise généralement JWT pour l'authentification. Le token est stocké dans httpOnly cookies pour la sécurité. Côté back-end, je valide le token à chaque requête avec un middleware. J'implémente aussi le refresh token pour prolonger les sessions.",
            "feedback": "Excellente réponse qui montre une bonne compréhension de la sécurité. Mention des bonnes pratiques comme httpOnly cookies.",
            "grade": 10,
            "interview_id": 1
        },
        {
            "question": "Décrivez-moi un projet dont vous êtes particulièrement fière.",
            "answer": "J'ai développé une plateforme de réservation en temps réel pour un réseau de salles de sport. Le défi était de gérer la concurrence sur les réservations. J'ai utilisé WebSockets pour les mises à jour en temps réel et implémenté un système de verrouillage optimiste en base de données.",
            "feedback": "Excellent exemple qui démontre la capacité à résoudre des problèmes complexes. Bonne connaissance des systèmes temps réel.",
            "grade": 9,
            "interview_id": 1
        },
        {
            "question": "Quelles sont vos attentes pour ce poste ?",
            "answer": "Je recherche un environnement où je peux continuer à apprendre, notamment sur l'architecture microservices et le cloud. J'aimerais aussi avoir l'opportunité de mentorer des développeurs juniors et contribuer aux décisions techniques.",
            "feedback": "Réponse mature qui montre de l'ambition et l'envie de progresser. Bon alignement avec la culture d'entreprise.",
            "grade": 8,
            "interview_id": 1
        }
    ]
    
    # Interview 2: Data Scientist (Alice - Neutral interviewer)
    interview_2_questions = [
        {
            "question": "Expliquez-moi votre expérience en machine learning.",
            "answer": "J'ai travaillé sur des projets de classification et de régression. J'utilise principalement scikit-learn et parfois TensorFlow. J'ai fait un projet de prédiction de churn clients avec un random forest qui a atteint 85% de précision.",
            "feedback": "Réponse correcte mais manque de profondeur sur les aspects théoriques. Aurait pu mentionner les métriques de validation croisée.",
            "grade": 6,
            "interview_id": 2
        },
        {
            "question": "Comment choisissez-vous entre différents algorithmes de ML ?",
            "answer": "Ça dépend du problème. Pour la classification, j'essaie plusieurs algorithmes et je compare leurs performances. Je regarde aussi la taille du dataset et si j'ai besoin d'interprétabilité.",
            "feedback": "Réponse trop générique. Manque de méthodologie structurée et de connaissance des compromis biais-variance.",
            "grade": 5,
            "interview_id": 2
        },
        {
            "question": "Qu'est-ce que l'overfitting et comment le prévenir ?",
            "answer": "L'overfitting c'est quand le modèle apprend trop bien les données d'entraînement et ne généralise pas. Pour le prévenir, on utilise la validation croisée, la régularisation, et on peut réduire la complexité du modèle.",
            "feedback": "Bonne compréhension du concept et des solutions principales. Réponse satisfaisante.",
            "grade": 7,
            "interview_id": 2
        },
        {
            "question": "Avez-vous de l'expérience avec le deep learning ?",
            "answer": "J'ai suivi des cours en ligne et fait quelques tutoriels avec TensorFlow. J'ai créé un modèle CNN pour classifier des images de chiens et chats qui marchait plutôt bien.",
            "feedback": "Expérience limitée, principalement académique. Pas d'expérience en production avec le deep learning.",
            "grade": 5,
            "interview_id": 2
        },
        {
            "question": "Comment présentez-vous vos résultats aux parties prenantes non-techniques ?",
            "answer": "J'utilise beaucoup de visualisations avec matplotlib et seaborn. J'essaie d'expliquer les résultats simplement sans trop de jargon technique. Je fais aussi des présentations PowerPoint avec les insights clés.",
            "feedback": "Approche correcte mais pourrait être plus détaillée sur l'adaptation du discours aux différents publics.",
            "grade": 6,
            "interview_id": 2
        }
    ]
    
    # Interview 3: Chef de Projet IT (Bob - Mean interviewer)
    interview_3_questions = [
        {
            "question": "Combien de projets IT avez-vous gérés de bout en bout ?",
            "answer": "J'ai participé à plusieurs projets en tant que membre d'équipe, et j'ai coordonné un petit projet de migration de serveurs l'année dernière.",
            "feedback": "Expérience clairement insuffisante pour un poste de chef de projet. Pas de gestion de projet d'envergure.",
            "grade": 3,
            "interview_id": 3
        },
        {
            "question": "Comment gérez-vous un projet en retard avec un budget dépassé ?",
            "answer": "Euh, je pense qu'il faut d'abord identifier pourquoi on est en retard. Ensuite, peut-être renégocier les délais avec le client ou demander plus de ressources.",
            "feedback": "Réponse vague et peu convaincante. Manque de méthodologie et d'expérience concrète dans la gestion de crise.",
            "grade": 2,
            "interview_id": 3
        },
        {
            "question": "Quels outils de gestion de projet maîtrisez-vous ?",
            "answer": "J'ai utilisé Trello et un peu Jira. Je connais aussi Excel pour suivre les budgets.",
            "feedback": "Connaissance très basique des outils. Pour un chef de projet, c'est insuffisant. Pas de mention de MS Project, Gantt, ou outils avancés.",
            "grade": 3,
            "interview_id": 3
        },
        {
            "question": "Décrivez-moi un conflit d'équipe que vous avez résolu.",
            "answer": "Il y a eu une fois deux développeurs qui n'étaient pas d'accord sur l'approche technique. J'ai organisé une réunion pour qu'ils discutent et ils ont trouvé un compromis.",
            "feedback": "Exemple trop simple et rôle passif. Un chef de projet doit montrer du leadership et une capacité de médiation plus forte.",
            "grade": 4,
            "interview_id": 3
        },
        {
            "question": "Pourquoi voulez-vous ce poste de chef de projet ?",
            "answer": "Je pense que c'est une évolution naturelle dans ma carrière. J'aime coordonner les personnes et j'aimerais avoir plus de responsabilités.",
            "feedback": "Motivation peu convaincante. Manque de compréhension réelle des défis du poste et de vision stratégique.",
            "grade": 3,
            "interview_id": 3
        }
    ]
    
    # Interview 4: Designer UX/UI (Claire - Nice interviewer)
    interview_4_questions = [
        {
            "question": "Parlez-moi de votre approche du design centré utilisateur.",
            "answer": "Je commence toujours par comprendre les utilisateurs à travers des interviews et des persona. Ensuite, je crée des wireframes et des prototypes que je teste avec de vrais utilisateurs. J'itère en fonction des retours avant de finaliser les maquettes haute-fidélité.",
            "feedback": "Excellente méthodologie ! Processus bien structuré qui montre une vraie compréhension du design thinking.",
            "grade": 10,
            "interview_id": 4
        },
        {
            "question": "Comment gérez-vous les retours contradictoires des parties prenantes ?",
            "answer": "Je ramène toujours la discussion aux objectifs utilisateurs et business. Je présente des données d'usage ou des tests utilisateurs pour appuyer mes choix. Si besoin, j'organise des ateliers collaboratifs pour aligner tout le monde.",
            "feedback": "Très bonne approche diplomatique basée sur les données. Montre de la maturité professionnelle.",
            "grade": 9,
            "interview_id": 4
        },
        {
            "question": "Quel est votre outil de design préféré et pourquoi ?",
            "answer": "J'utilise principalement Figma pour sa collaboration en temps réel. Les composants réutilisables et les variables de design permettent de maintenir la cohérence. J'apprécie aussi l'intégration avec les outils de développement comme Zeplin.",
            "feedback": "Excellente maîtrise des outils modernes. Bonne compréhension de l'importance du design system.",
            "grade": 9,
            "interview_id": 4
        },
        {
            "question": "Montrez-moi un projet de votre portfolio dont vous êtes particulièrement fière.",
            "answer": "J'ai redesigné l'application mobile d'une banque. Le taux de completion des virements est passé de 60% à 92% après le redesign. J'ai simplifié le parcours de 7 à 3 étapes et ajouté des confirmations visuelles claires. Les retours utilisateurs sont passés de 3.2 à 4.6 étoiles.",
            "feedback": "Présentation exceptionnelle avec des métriques concrètes d'impact. Démontre la valeur business du design.",
            "grade": 10,
            "interview_id": 4
        },
        {
            "question": "Comment vous tenez-vous à jour sur les tendances UX/UI ?",
            "answer": "Je suis plusieurs newsletters comme Nielsen Norman Group et Smashing Magazine. Je participe à des meetups UX locaux et je suis des cours sur Interaction Design Foundation. J'analyse aussi régulièrement les patterns des apps leaders comme Airbnb ou Stripe.",
            "feedback": "Très bon engagement dans l'apprentissage continu. Sources de qualité et approche proactive.",
            "grade": 9,
            "interview_id": 4
        }
    ]
    
    # Combine all questions
    all_questions = (
        interview_1_questions + 
        interview_2_questions + 
        interview_3_questions + 
        interview_4_questions
    )
    
    # Insert all question_answers
    session.execute(
        question_answers_table.insert(),
        all_questions
    )
    
    session.commit()


def downgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    
    # Delete in reverse order (foreign keys)
    session.execute(sa.text("DELETE FROM question_answers"))
    session.execute(sa.text("DELETE FROM interviews"))
    session.execute(sa.text("DELETE FROM users"))
    
    session.commit()