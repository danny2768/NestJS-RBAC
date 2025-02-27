import * as ms from 'ms';
import { StringValue } from 'ms';

export class TimeAdapter {
  public static toSeconds(time: string): number {
    return Math.floor(ms(time as StringValue) / 1000);
  }

  public static toMilliseconds(time: string): number {
    return ms(time as StringValue);
  }
}
