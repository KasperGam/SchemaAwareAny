import { GraphQLError } from 'graphql';
import { DateScalar } from './DateScalar';

describe('Date Scalar base tests', () => {
  it('Serialization works', () => {
    const date = new Date('1/1/2024');

    expect(DateScalar.serialize(date)).toEqual(date.toISOString());
  });
  it('Parsing succeeds', () => {
    const date = new Date('1/1/2024');

    expect(DateScalar.parseValue(date.toISOString())).toEqual(date);
  });

  it('Parsing fails for wrong type', () => {
    expect(() => DateScalar.parseValue(1)).toThrow(GraphQLError);
    expect(() => DateScalar.parseValue({})).toThrow(GraphQLError);
    expect(() => DateScalar.parseValue(true)).toThrow(GraphQLError);
    expect(() => DateScalar.parseValue('hello there')).toThrow(GraphQLError);
    expect(() => DateScalar.parseValue(undefined)).toThrow(GraphQLError);
  });
});
