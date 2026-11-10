export function demoLessonCopy(value: string) {
  return value.replace(/교육\s*교범|교육자료|교육|교본/g, '교범');
}
