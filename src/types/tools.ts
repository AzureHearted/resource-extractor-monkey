// t 排除T类型中的U类型的工具类型
export type ExcludeType<T,U> = T extends U ? never : T;