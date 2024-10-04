import { GraphQLError } from 'graphql';
import { UserRoleScalar } from './UserRoleScalar';

describe('UserRoleScalar', () => {
  it('Serialize succeeds', () => {
    expect(UserRoleScalar.serialize('admin')).toEqual('admin');
    expect(UserRoleScalar.serialize('user')).toEqual('user');
    expect(UserRoleScalar.serialize('guest')).toEqual('guest');
  });

  it('Serialize fails for other strings and types', () => {
    expect(() => UserRoleScalar.serialize('test')).toThrow(GraphQLError);
    expect(() => UserRoleScalar.serialize(1)).toThrow(GraphQLError);
    expect(() => UserRoleScalar.serialize(null)).toThrow(GraphQLError);
    expect(() => UserRoleScalar.serialize({})).toThrow(GraphQLError);
  });

  it('Parse value succeeds for enum values', () => {
    expect(UserRoleScalar.parseValue('admin')).toEqual('admin');
    expect(UserRoleScalar.parseValue('user')).toEqual('user');
    expect(UserRoleScalar.parseValue('guest')).toEqual('guest');

    expect(UserRoleScalar.parseValue(2)).toEqual('admin');
    expect(UserRoleScalar.parseValue(1)).toEqual('user');
    expect(UserRoleScalar.parseValue(0)).toEqual('guest');
  });

  it('Parse value fails for any other values', () => {
    expect(() => UserRoleScalar.parseValue('test')).toThrow(GraphQLError);
    expect(() => UserRoleScalar.parseValue(5)).toThrow(GraphQLError);
    expect(() => UserRoleScalar.parseValue(null)).toThrow(GraphQLError);
    expect(() => UserRoleScalar.parseValue({})).toThrow(GraphQLError);
  });
});
