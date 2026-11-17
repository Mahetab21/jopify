# API reference

Base URL: `http://localhost:5000`. Request/response bodies are JSON unless a multipart upload is specified. Protected endpoints expect `Authorization: Bearer <access_token>` with the example configuration.

## Authentication and profiles

| Method | Path | Access / input |
| --- | --- | --- |
| POST | `/users/signUp` | Public; registration JSON or multipart with optional `profileImage` |
| POST | `/users/confirmEmail` | Public; `email`, six-digit string `otp` |
| POST | `/users/resendConfirmation` | Public; `email` |
| POST | `/users/signIn` | Public; `email`, `password` |
| POST | `/users/logInWithGmail` | Public; Google `idToken` |
| POST | `/users/logOut` | Authenticated; `flag: "current"` or `"all"` |
| PATCH | `/users/forgetPassword` | Public; `email` |
| PATCH | `/users/resetPassword` | Public; `email`, `otp`, `password`, `cPassword` |
| GET | `/users/getProfile` | Authenticated; own profile |
| GET | `/users/profile/:userId` | Authenticated; another user's profile |
| PUT | `/users/updateBasicInfo` | Authenticated; one or more editable profile fields |
| POST | `/users/addExperiance` | Authenticated; experience object |
| PUT | `/users/updateExperiance/:experianceId` | Authenticated; partial experience |
| DELETE | `/users/deleteExperiance/:experianceId` | Authenticated |
| POST | `/users/addEducation` | Authenticated; education object |
| PUT | `/users/updateEducation/:educationId` | Authenticated; partial education |
| DELETE | `/users/deleteEducation/:educationId` | Authenticated |
| POST | `/users/uploadResume` | Authenticated; multipart file field `resume` |
| PUT | `/users/updateSkills` | Authenticated; `{ "skills": ["TypeScript", "MongoDB"] }` |
| GET | `/users/getSavedJobs` | Authenticated |
| POST | `/users/saveJob/:jobId` | Authenticated |
| DELETE | `/users/removeSavedJob/:jobId` | Authenticated |

### Registration example

```json
{
  "firstName": "Mona",
  "lastName": "Ahmed",
  "email": "mona@example.com",
  "password": "ExamplePassword123",
  "cPassword": "ExamplePassword123",
  "age": 24,
  "gender": "female",
  "role": "job_seeker",
  "phoneNumber": "+201000000000",
  "location": "Cairo"
}
```

Use `employer` for an employer account. An `admin` role is rejected by public signup. Confirm email before signing in. An expired OTP can be replaced through `resendConfirmation`. A signup can persist an unconfirmed user even if email delivery fails; use the resend endpoint after correcting email configuration.

Login returns `access_token`, `refresh_token` and a sanitized `user`. Access tokens expire after one day; refresh tokens after one year. There is currently no refresh exchange endpoint. Job seekers use the user signing keys; employers and admins use the admin signing keys. Authorization still checks the stored role and resource owner.

Editable basic fields: `firstName`, `lastName`, `userName` (first and last name), `age`, `location`, `phoneNumber`, `bio`, `gender`, `expectedSalary`, `jobTypePreferences`, `notificationsEnabled`, `socialLinks`.

Experience: `company`, `position`, `startDate`, optional `endDate`, `isCurrent`, optional `description`.
Education: `institution`, `degree`, `fieldOfStudy`, `startDate`, optional `endDate`, `isCurrent`, optional `description`. Dates are ISO date strings.

## Jobs

| Method | Path | Access |
| --- | --- | --- |
| POST | `/jobs/create` | Employer/admin |
| PUT | `/jobs/:jobId` | Posting employer/admin |
| DELETE | `/jobs/:jobId` | Posting employer/admin; soft delete |
| DELETE | `/jobs/hard-delete/:jobId` | Posting employer/admin; permanent deletion |
| GET | `/jobs/get-all` | Public; active jobs only |
| GET | `/jobs/my-jobs` | Employer/admin; own non-deleted jobs |
| GET | `/jobs/:jobId` | Public; active, non-deleted job |

### Create a job

```json
{
  "companySnapshot": { "name": "Example Company" },
  "title": "Backend Developer",
  "description": "Build reliable recruitment APIs with Node.js, Express, TypeScript and MongoDB.",
  "responsibilities": ["Design and maintain REST APIs"],
  "requirements": ["Experience with Node.js and MongoDB"],
  "preferredQualifications": ["Knowledge of automated testing"],
  "location": "Cairo",
  "employmentType": "full_time",
  "experienceLevel": "entry_level",
  "salaryRange": { "min": 12000, "max": 20000 },
  "skillsRequired": ["Node.js", "TypeScript"],
  "category": "Engineering",
  "openings": 2,
  "isRemote": false
}
```

Optional `applicationDeadline` must be in the future. New jobs are active. Update accepts a nonempty subset of the creation fields except `applicationDeadline`; there is no publish-draft or reopen endpoint.

JSON works without a logo. To include one, use multipart field `logo`, bracketed object/array fields (for example `companySnapshot[name]`, `requirements[0]`) and text representations of `openings`, `salaryRange[min]`, `salaryRange[max]`, `isRemote`.

### Search query

| Parameter | Values / behavior |
| --- | --- |
| `page`, `limit` | Positive integers; defaults 1/10, limit at most 100 |
| `search` | Case-insensitive literal text in title, description or company name |
| `location`, `category` | Case-insensitive literal text |
| `employmentType` | `full_time`, `part_time`, `remote`, `internship` |
| `experienceLevel` | `entry_level`, `mid_level`, `senior_level`, `lead_level`, `executive` |
| `isRemote` | `true` or `false` |
| `minSalary` | Job minimum salary greater than or equal to this value |
| `maxSalary` | Job maximum salary less than or equal to this value |
| `sortBy` | `createdAt`, `salaryRange.max`, `applicationsCount` |
| `sortOrder` | `asc` or `desc`; defaults to `desc` |
| `status` | Public list permits only `active`; own-jobs list also accepts `closed`/`draft` |

Example: `GET /jobs/get-all?search=Node.js&isRemote=false&page=1&limit=10`.

## Applications

| Method | Path | Access / input |
| --- | --- | --- |
| POST | `/job-applications/apply/:jobId` | Job seeker; multipart `resume`, optional `coverLetter` |
| GET | `/job-applications/my-applications` | Job seeker; own applications |
| GET | `/job-applications/job/:jobId` | Posting employer/admin |
| GET | `/job-applications/all` | Admin |
| PUT | `/job-applications/:appId/status` | Posting employer/admin; `{ "status": "reviewed" }` |
| DELETE | `/job-applications/:appId` | Application owner; pending only |
| GET | `/job-applications/stats` | Seeker: own applications; employer: applications for own jobs; admin: all |

Statuses: `pending`, `reviewed`, `shortlisted`, `rejected`, `accepted`. Status updates validate these values but do not enforce a transition graph. List endpoints accept `page`, `limit`, `status`. The admin list also accepts `jobId` and `userId`.

One application per job/user is enforced by a database index. The job must be active and its deadline must not have passed.

## Messaging

All routes require authentication.

| Method | Path | Input / behavior |
| --- | --- | --- |
| POST | `/messages/send` | `receiverId`, nonblank `content` up to 1,000 characters |
| GET | `/messages/conversations` | `page`, `limit` (default 10); latest message and unread count |
| GET | `/messages/conversation/:userId` | `page`, `limit` (default 20); also marks incoming messages read |
| PUT | `/messages/:messageId/read` | Recipient only |
| DELETE | `/messages/:messageId` | Hides message for the caller; deletes it after both parties hide it |

### Socket.IO

Connect to the same host and port as the HTTP API:

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  auth: { token: "Bearer <access_token>" }
});

socket.on("new-message", message => console.log(message));
socket.on("message-seen", receipt => console.log(receipt));
socket.emit("typing", { receiverId: "<user_id>" });
socket.emit("stop-typing", { receiverId: "<user_id>" });
```

| Event | Direction | Payload |
| --- | --- | --- |
| `new-message` | Server → recipient | Persisted message with populated sender/receiver |
| `message-seen` | Server → sender | `{ messageId, by }` from the explicit read endpoint |
| `user-online`, `user-offline` | Server → connected clients | User ID |
| `typing`, `stop-typing` | Client → server | `{ receiverId }` |
| `typing`, `stop-typing` | Server → recipient | `{ senderId }` |

Messages are sent through the REST endpoint; Socket.IO delivers events. Both raw access tokens and prefixed tokens are accepted in the handshake. Authentication checks the user, confirmation status, account activity and token revocation at connection time. Multiple simultaneous connections are supported.

`delivered` means the message was emitted to an online recipient, not that a client acknowledged receipt. Offline messages remain `sent`.

## Uploads, responses and errors

- Maximum file size: **5 MB** per file.
- Images: JPEG/PNG. Documents: PDF, DOC, DOCX.
- File types are checked using the supplied MIME type; content inspection is a future hardening task.
- Upload responses contain S3 object keys, not public URLs.
- Paginated responses contain `pagination.current_page`, `total_pages`, `total_count`, `limit`, plus the resource array.
- Typical errors: 400 validation, 401 missing/invalid authentication, 403 permissions, 404 missing resource, 409 duplicate, 413 large JSON body, 429 rate limit and 500 unexpected failures.
- The API applies a global limit of 100 requests per IP per 15 minutes.

```json
{
  "status": "error",
  "statusCode": 403,
  "message": "You are not authorized to update this job"
}
```
