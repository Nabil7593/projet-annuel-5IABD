# Guide de Configuration AWS RDS PostgreSQL

## 📋 Étape 1 : Créer un compte AWS

1. Allez sur [aws.amazon.com](https://aws.amazon.com)
2. Cliquez sur "Créer un compte AWS"
3. Suivez les étapes (vous aurez besoin d'une carte bancaire, mais le free tier est gratuit pendant 12 mois)

## 🗄️ Étape 2 : Créer une instance RDS PostgreSQL

### 2.1 Accéder à RDS

1. Connectez-vous à la [Console AWS](https://console.aws.amazon.com)
2. Dans la barre de recherche en haut, tapez "RDS"
3. Cliquez sur "RDS" pour accéder au service

### 2.2 Créer la base de données

1. Cliquez sur le bouton orange **"Create database"** (Créer une base de données)

2. **Méthode de création** :
   - Sélectionnez : **Standard create**

3. **Type de moteur** :
   - Choisissez : **PostgreSQL**
   - Version : **PostgreSQL 15.x** (dernière version stable)

4. **Templates** :
   - Sélectionnez : **Free tier** (gratuit pendant 12 mois)
   - ⚠️ Si vous ne voyez pas "Free tier", c'est que votre région ne le supporte pas ou que vous l'avez déjà utilisé

5. **Settings** (Paramètres) :
   - **DB instance identifier** : `restaurant-db` (ou un nom de votre choix)
   - **Master username** : `postgres` (gardez le par défaut)
   - **Master password** : Choisissez un mot de passe fort et **notez-le précieusement** !
   - **Confirm password** : Répétez le mot de passe

6. **Instance configuration** :
   - **DB instance class** : `db.t3.micro` ou `db.t4g.micro` (éligible au free tier)

7. **Storage** :
   - **Storage type** : `General Purpose SSD (gp2)`
   - **Allocated storage** : `20 GiB` (minimum pour free tier)
   - **Storage autoscaling** : Vous pouvez le désactiver pour éviter les coûts supplémentaires

8. **Connectivity** (Connectivité - TRÈS IMPORTANT !) :
   - **Compute resource** : Don't connect to an EC2 compute resource
   - **Network type** : IPv4
   - **Virtual private cloud (VPC)** : Gardez le VPC par défaut
   - **DB subnet group** : Gardez le par défaut
   - **Public access** : **YES** ⚠️ (Important pour pouvoir se connecter depuis votre PC)
   - **VPC security group** : Create new
   - **New VPC security group name** : `restaurant-db-sg`

9. **Database authentication** :
   - Sélectionnez : **Password authentication**

10. **Additional configuration** (Configuration supplémentaire) :
    - **Initial database name** : `restaurant_db` (IMPORTANT : ne pas oublier !)
    - Décochez **"Enable automated backups"** (pour éviter les coûts en dev)
    - Décochez **"Enable Enhanced monitoring"** (idem)

11. Cliquez sur **"Create database"** (bouton orange en bas)

### 2.3 Attendre la création

⏱️ La création de la base de données prend environ **5-10 minutes**. Le statut passera de "Creating" à "Available".

## 🔐 Étape 3 : Configurer le Security Group

Une fois la base de données créée, vous devez autoriser votre adresse IP à se connecter :

1. Dans la console RDS, cliquez sur votre base de données `restaurant-db`
2. Dans l'onglet **"Connectivity & security"**, trouvez la section **"Security"**
3. Cliquez sur le lien du **"VPC security groups"** (quelque chose comme `restaurant-db-sg`)
4. Cliquez sur l'onglet **"Inbound rules"**
5. Cliquez sur **"Edit inbound rules"**
6. Cliquez sur **"Add rule"**
7. Configurez la règle :
   - **Type** : `PostgreSQL`
   - **Protocol** : `TCP`
   - **Port range** : `5432`
   - **Source** :
     - **Option 1 (Recommandée pour dev)** : `My IP` (votre IP sera automatiquement détectée)
     - **Option 2 (Moins sécurisé mais plus simple)** : `Anywhere-IPv4` (0.0.0.0/0)
8. Cliquez sur **"Save rules"**

## 📝 Étape 4 : Récupérer les informations de connexion

1. Dans la console RDS, cliquez sur votre base de données `restaurant-db`
2. Dans l'onglet **"Connectivity & security"**, notez :
   - **Endpoint** : quelque chose comme `restaurant-db.xxxxxx.eu-west-3.rds.amazonaws.com`
   - **Port** : `5432`

## 🔗 Étape 5 : Configurer l'URL de connexion

Dans votre fichier `.env`, remplacez la ligne `DATABASE_URL` par :

```env
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@VOTRE_ENDPOINT:5432/restaurant_db?schema=public"
```

**Exemple concret** :
```env
DATABASE_URL="postgresql://postgres:MonMotDePasse123!@restaurant-db.c9s8x1y2z3a4.eu-west-3.rds.amazonaws.com:5432/restaurant_db?schema=public"
```

Remplacez :
- `postgres` : votre username (normalement c'est `postgres`)
- `VOTRE_MOT_DE_PASSE` : le mot de passe que vous avez défini
- `VOTRE_ENDPOINT` : l'endpoint copié depuis la console RDS
- `restaurant_db` : le nom de la base de données initiale

## ✅ Étape 6 : Tester la connexion

Une fois configuré, exécutez dans votre terminal :

```bash
npx prisma generate
npx prisma db push
```

Si tout fonctionne, vous verrez un message de succès ! 🎉

## 💡 Conseils supplémentaires

### Pour éviter les coûts :
- ⚠️ **IMPORTANT** : Pensez à **arrêter ou supprimer** votre instance RDS quand vous ne l'utilisez pas
- Vous pouvez arrêter une instance RDS pendant max 7 jours (après elle redémarre automatiquement)
- Pour arrêter : RDS Console → Sélectionnez votre DB → Actions → Stop temporarily

### Pour la production :
- Désactivez **Public access**
- Activez les **Automated backups**
- Utilisez des **secrets AWS Secrets Manager** pour les credentials
- Configurez un **VPN ou AWS VPC** pour l'accès sécurisé

### En cas de problème :
- Vérifiez que le Security Group autorise votre IP
- Vérifiez que "Public access" est bien sur "Yes"
- Vérifiez que le mot de passe ne contient pas de caractères spéciaux problématiques (privilégiez lettres + chiffres)
- Vérifiez que le nom de la base de données initiale a bien été défini

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes, partagez-moi :
1. Le message d'erreur exact
2. Une capture d'écran de votre configuration RDS (sans montrer les mots de passe !)
