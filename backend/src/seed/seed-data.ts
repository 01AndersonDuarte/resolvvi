export type SeedMovement = {
  movementDate: Date;
  movementTitle: string;
  movementContent: string | null;
  sourceOrder: number;
};

export type SeedProcess = {
  cnj: string;
  forum: string;
  court: string;
  lawsuitValue: string;
  numberOfAuthors: number;
  movements: SeedMovement[];
};
