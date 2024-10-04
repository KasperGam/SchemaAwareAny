import { GraphQLError, GraphQLScalarType, Kind, ValueNode } from 'graphql';

type UserRole = 'admin' | 'user' | 'guest';

const UserRoleEnumMap: Record<number, UserRole> = {
  [2]: 'admin',
  [1]: 'user',
  [0]: 'guest',
};

const verifyRoleString = (role: string): role is UserRole => {
  switch (role) {
    case 'admin':
    case 'user':
    case 'guest':
      return true;
    default:
      return false;
  }
};

/**
 * Testing scalar- will convert strings to a "UserRole" type
 * The scalar value will also convert input numbers to the scalar type, simulating a 'legacy'
 * method of enums before moving to something like graphql
 * The user roles and their numerical values are:
 * 'admin' => 2
 * 'user' => 1
 * 'guest' => 0
 */
export const UserRoleScalar = new GraphQLScalarType<UserRole, string | number>({
  name: 'UserRole',
  serialize(value: unknown) {
    if (typeof value === 'string') {
      if (verifyRoleString(value)) {
        return value;
      } else {
        throw new GraphQLError(`Unrecognized user role ${value}`);
      }
    } else {
      throw new GraphQLError(
        `Invalid type when serializing user role! ${value}`,
      );
    }
  },
  parseValue(value: unknown) {
    if (typeof value === 'string') {
      if (verifyRoleString(value)) {
        return value;
      } else {
        throw new GraphQLError(`Unrecognized user role ${value}`);
      }
    } else if (typeof value === 'number') {
      const role = UserRoleEnumMap[value];
      if (!role) {
        throw new GraphQLError(`Unrecognized user role enum value ${value}`);
      } else {
        return role;
      }
    } else {
      throw new GraphQLError(`Invalid value when parsing user role ${value}`);
    }
  },
  parseLiteral(valueNode: ValueNode) {
    if (valueNode.kind === Kind.STRING) {
      if (verifyRoleString(valueNode.value)) {
        return valueNode.value;
      } else {
        throw new GraphQLError(`Unrecognized user role ${valueNode.value}`);
      }
    } else if (valueNode.kind === Kind.INT) {
      const role = UserRoleEnumMap[valueNode.value];
      if (!role) {
        throw new GraphQLError(
          `Unrecognized user role enum value ${valueNode.value}`,
        );
      } else {
        return role;
      }
    } else {
      throw new GraphQLError(
        `Invalid node kind when parsing user role! ${valueNode.kind}`,
      );
    }
  },
});
