export type SlackAtlasUser = {
  id: string,
  userName: string,
  email: string,
  title: string,
  managerId: string | undefined,
  manager: SlackAtlasUser | undefined,
  active: boolean,
  userType: string | undefined
  profileOnlyUser: boolean
};