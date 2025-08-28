# Team Role Assignment System

This application is a web-based system for assigning roles to team members based on their skills, experience, and personality traits. It uses AI-powered assignment for optimal team composition.

## Features
- Session-based team management
- Applicant registration with skills and traits
- AI-driven role assignment
- Admin dashboard for session and team management
- Multi-language support

## Setup

### Prerequisites
- Node.js (v18 or later)
- npm
- Supabase account (for database)

## Usage

### As a User
1. **Join a Session**:
   - Visit the home page
   - Enter the 6-character session code provided by the admin
   - Click "Join Meeting"

2. **Join a Team**:
   - Once in the session, you'll see available teams
   - Select a team and click "Join"
   - Fill in your details:
     - Name
     - Occupation
     - Years/Months of experience
     - Up to 5 skills (each <=30 characters)
     - Up to 5 personality traits (each <=40 characters)
   - Submit to apply

3. **View Results**:
   - When the team is full and assignment is complete
   - Go to Results page
   - View assigned roles, justifications, and scores

### As an Admin
1. **Login**:
   - From the header or /admin page
   - Enter the admin password set in .env

2. **Manage Sessions**:
   - Create new sessions
   - Generate session codes
   - Monitor applicants

3. **Manage Teams**:
   - Create teams within sessions
   - Trigger role assignments
   - View detailed results

**隐私政策**

本项目不收集、存储或共享任何个人数据。

- 我们不会追踪用户。
- 我们不会向第三方出售或共享数据。

所有用户交互均保持本地或基于会话，并且除应用程序功能严格必需的信息（例如，内存中的会话或团队数据）外，不会存储任何个人信息。

本软件按“原样”提供，不提供任何明示或暗示的担保，包括但不限于适销性、适用于特定用途和非侵权的担保。

使用本项目，即表示您确认并同意：

我们不会收集任何个人身份信息 (PII)。

如果您部署或修改本项目以用于更广泛的环境（例如，生产环境），您有责任确保您自己遵守当地的数据保护法。

如果您对隐私有任何疑问或疑虑，请直接联系项目维护者。

**Privacy Policy**

This project does not collect, store, or share any personal data.

- We do not track users.
- We do not sell or share data with third parties.

All user interactions remain local or session-based, and no personal information is stored beyond what is strictly necessary for the functionality of the app (e.g., session or team data in memory).

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement.

By using this project, you acknowledge and agree that:

No personally identifiable information (PII) is collected.

You are responsible for ensuring your own compliance with local data protection laws if you deploy or modify this project for use in a broader context (e.g., production environments).

If you have any questions or concerns regarding privacy, please contact the project maintainer directly.
